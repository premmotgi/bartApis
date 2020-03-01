const express = require('express');
const request = require('request');
const handlebars = require('express-handlebars').create({ defaultLayout: 'main' });

const app = express();

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const apiKey = "ZMBH-PXUN-9VLT-DWE9";

const PORT = process.env.PORT || 3000;

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', PORT);

app.use(express.static('public'));

app.get('/', function (req, res, next) {
  let context = {};

  // Request number of trains in service
  request('https://api.bart.gov/api/bsa.aspx?cmd=count&json=y&key=' + apiKey, function (err, response, body) {
    if (!err && response.statusCode < 400) {
      // Parse and store train count info
      let countJSON = JSON.parse(body);
      context.count = countJSON.root.traincount;

      // Render home page
      res.render('home', context);
    }
    else {
      if (response) {
        console.log(response.statusCode);
      }
      next(err);
    }
  });
});

app.get('/arrivals', function (req, res, next) {
  let context = {};

  // Request list of stations
  request('http://api.bart.gov/api/stn.aspx?cmd=stns&json=y&key=' + apiKey, function (err, response, body) {
    if (!err && response.statusCode < 400) {
      // Parse and store list of stations
      let stationsJSON = JSON.parse(body);
      context.stations = stationsJSON.root.stations.station;

      // If a station has been queried, request arrival estimates
      if (req.query.stn) {
        request('http://api.bart.gov/api/etd.aspx?cmd=etd&orig=' + req.query.stn + '&json=y&key=' + apiKey, function (err, response, body) {
          if (!err && response.statusCode < 400) {
            context.stn = req.query.stn;

            // Parse and store arrival estimates
            let responseJSON = JSON.parse(body);
            context.time = responseJSON.root.time;
            context.stnName = responseJSON.root.station[0].name;
            context.arrivals = responseJSON.root.station[0].etd;

            // Render arrivals view
            res.render('arrivals', context);
          }
          else {
            if (response) {
              console.log(response.statusCode);
            }
            next(err);
          }
        });
      }
      else {
        res.render('arrivals', context);
      }
    }
    else {
      if (response) {
        console.log(response.statusCode);
      }
      next(err);
    }
  });
});

app.get('/stations', function (req, res, next) {
  let context = {};

  // Request list of stations
  request('http://api.bart.gov/api/stn.aspx?cmd=stns&json=y&key=' + apiKey, function (err, response, body) {
    if (!err && response.statusCode < 400) {
      // Parse and store list of stations
      let stationsJSON = JSON.parse(body);
      context.stations = stationsJSON.root.stations.station;

      // Render stations list view
      res.render('station', context);
    }
    else {
      if (response) {
        console.log(response.statusCode);
      }
      next(err);
    }
  });
});

app.get('/stations/:stn', function (req, res, next) {
  let context = {};

  // Request station information
  request('http://api.bart.gov/api/stn.aspx?cmd=stninfo&orig=' + req.params.stn + '&json=y&key=' + apiKey, function (err, response, body) {
    if (!err && response.statusCode < 400) {
      context.stn = req.params.stn;

      // Parse and store station information
      let stationJSON = JSON.parse(body);
      context.station = stationJSON.root.stations.station;

      // Strip all link tags
      context.station.intro.text = stripLinkTags(context.station.intro['#cdata-section']);

      // Request station access information
      request('http://api.bart.gov/api/stn.aspx?cmd=stnaccess&orig=' + req.params.stn + '&json=y&key=' + apiKey, function (err, response, body) {
        if (!err && response.statusCode < 400) {
          // Parse and store station access info
          let accessJSON = JSON.parse(body);
          context.access = accessJSON.root.stations.station;

          // Strip all link tags
          context.access.entering.text = stripLinkTags(context.access.entering['#cdata-section']);
          context.access.exiting.text = stripLinkTags(context.access.exiting['#cdata-section']);
          context.access.parking.text = stripLinkTags(context.access.parking['#cdata-section']);
          context.access.lockers.text = stripLinkTags(context.access.lockers['#cdata-section']);
          context.access.bike_station_text.text = stripLinkTags(context.access.bike_station_text['#cdata-section']);

          // Set parking and bike parking bools
          context.parking = context.access['@parking_flag'] == '1';
          context.bike = context.access['@bike_flag'] == '1' || context.access['@locker_flag'] == '1' || context.access['@bike_station_flag'] == '1';
          context.bikeRacks = context.access['@bike_flag'] == '1';

          // Render station view
          res.render('station', context);
        }
        else {
          if (response) {
            console.log(response.statusCode);
          }
          next(err);
        }
      });
    }
    else {
      if (response) {
        console.log(response.statusCode);
      }
      next(err);
    }
  });

  // Function to strip out link tags
  function stripLinkTags(inputString) {
    return inputString.replace(/<\/?a[^>]*>/g, '');
  }
});

app.get('/about', function (req, res, next) {
  res.render('about');
});

app.use(function (req, res) {
  res.status(404);
  res.render('404');
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.type('plain/text');
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function () {
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});