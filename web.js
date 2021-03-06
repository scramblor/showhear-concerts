/**
 * Module dependencies.
 */
require('dotenv').config()

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , https = require('https')
  , path = require('path')
  , url = require('url')
  , qs = require('querystring')
  , util = require("util")
  // , pg = require('pg')
  , async = require('async')
  , {google} = require('googleapis')
  , icalendar = require('icalendar');

var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;

var mongohqurl = process.env.MONGODB_URI;
var app = express.createServer(express.logger());

var oneYear = 31557600000;
var oneDay = 86400;
var oneHour = 3600;

// initialize the Youtube API library
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jshtml');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public', {}));

  app.use("/Styles", express.static(__dirname + '/Styles'));
  app.use("/images", express.static(__dirname + '/images'));
  app.use("/js", express.static(__dirname + '/js'));
  app.use("/css", express.static(__dirname + '/css'));
  app.use("/jsdatepick-calendar", express.static(__dirname + '/jsdatepick-calendar'));
  app.use("/jsdatepick-calendar/img", express.static(__dirname + '/jsdatepick-calendar/img'));
  app.use("/Scripts", express.static(__dirname + '/Scripts'));
  app.use("/jquery-ui-1.9.2.custom", express.static(__dirname + '/jquery-ui-1.9.2.custom'));
  app.use("/jquerycookie", express.static(__dirname + '/jquerycookie'));
  app.use("/jquery-ui-1.10.0.custom", express.static(__dirname + '/jquery-ui-1.10.0.custom'));

  // app.enable("jsonp callback");

  // disable layout
  app.set("view options", {layout: false});

  // make a custom html template
  app.register('.html', {
    compile: function(str, options){
      return function(locals){
        return str;
      };
    }
  });

});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('cal')

// TODO ENDING GOOGLE TESTING

app.get('/', function(req, res) {
   //response.send('Hello World!');
   //response.send('Hello World again!');
   res.render('GigCast', {
     locals: {
        ogurl: getFullUrlFromReq(req),
        ogtitle: "ShowHear",
        ogdescription: "ShowHear - Find Concerts You'll Love"
      }
    });

   // var statsmixClient = new statsmix.Client();
   // statsmixClient.addMetric('Foo metric', fooCounterMetric, { track : true });
});


app.get('/area/:areaString', function (req, res) {

  // TODO do we want to support searching for text string passed here?

  var areaid = idFromUrlString(req.params.areaString);

   res.render('GigCast', {
     locals: {
        areaid: idFromUrlString(req.params.areaString),
        area: req.params.areaString,
        ogurl: getFullUrlFromReq(req),
        ogtitle: "ShowHear",
        ogdescription: "ShowHear - Find Concerts You'll Love"
      }
    });
});

app.get('/event/:eventid', function (req, res) {

  var eventid = idFromUrlString(req.params.eventid);

var options = {
    host: 'api.songkick.com',
    path: '/api/3.0/events/' + eventid + '.json?apikey=bUMFhmMfaIpxiUgJ'
  };


  http.get(options, function(skres) {
    var data = '';

    // console.log('STATUS: ' + skres.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(skres.headers));
    skres.on('data', function (chunk) {
      // console.log('BODY: ' + chunk);
      // response.write(chunk);
      data += chunk;
    });

    skres.on('end', function (chunk) {
      // console.log('BODY: ' + chunk);
      // data += chunk;
      if (chunk) {
        data += chunk;
      }

      // console.log(data);
      var songKickdata = JSON.parse(data);

      if (!(songKickdata.resultsPage.results)) {
        res.json({status:"error"});
        return;
      }

      // var locationString = songKickdata.resultsPage.results.event.venue.displayName;

      res.render('GigCast', {
       locals: {
          eventid: eventid,
          ogurl: getFullUrlFromReq(req),
          ogtitle: "I found a concert on ShowHear!",
          ogdescription: songKickdata.resultsPage.results.event.displayName
        }
      });

    });
  });
});

app.get('/venue/:venueid', function (req, res) {

   res.render('GigCast', {
     locals: {
        venueid: idFromUrlString(req.params.venueid),
        ogurl: getFullUrlFromReq(req),
        ogtitle: "ShowHear",
        ogdescription: "ShowHear - Find Concerts You'll Love"
      }
    });
});

app.get('/artist/:artistid', function (req, res) {

   res.render('GigCast', {
     locals: {
        artistid: req.params.artistid,
        ogurl: getFullUrlFromReq(req),
        ogtitle: "ShowHear",
        ogdescription: "ShowHear - Find Concerts You'll Love"
      }
    });
});

app.get('/data/:type', function (req, res) {
  console.log('Received ' + req.params.type + ' data');
  res.json({"data2": req.params.type, "parsed": idFromUrlString(req.params.type)});
  
  // console.log(idFromUrlString(req.params.type));
});

app.post('/logerror', function(request, response) {
    util.log("Client Error: " + request.body.msg);
    response.json({ 'status':"OK"})
});

app.post('/artistissue', function(request, response) {

  if(!request.query["artist"]) {
    console.log("artist required");
    response.json({status:"error", message:"artist required"});
    return;
  }

  if(!request.query["videoid"]) {
    console.log("videoid required");
    response.json({status:"error", message:"videoid required"});
    return;
  }

  myDb.collection('artistIssues', function(err, collection) {
    if(!err) {
      // console.log(collection);

      var issue = {
        'artist':request.query["artist"],
        'videoid':request.query["videoid"],
        'create-date':new Date().toISOString(),
        'status':'new'
      };

      if (request.query["msg"]) {
        issue.msg = request.query["msg"];
      }

      collection.insert(issue, function(err, result) {});

    } else {
      console.log("could not get collection");
    }
  });

  response.json({status:"success", message:"input valid"});
});

app.get('/test', function(request, response) {
   //response.send('Hello World!');
   //response.send('Hello World again!');
   // response.render('GigCast.html', {
    console.log("here= ", request.query["heref"]);

   response.json({ 'testvar':"defaultme", "sqlquery":"none"})
});

// MongoClient.connect(mongohqurl", function(err, db) {
//   if(!err) {
//     console.log("We are mongo connected");
//     db.collection('testCollection2', function(err, collection) {
//       if(!err) {
//         // console.log(collection);

//         var doc1 = {'hello':'doc1'};
//         var doc2 = {'hello':'doc2'};
//         var lotsOfDocs = [{'hello':'doc3'}, {'hello':'doc4'}];

//         // collection.insert(doc1, function(err, result) {});

//         collection.find().toArray(function(err, items) {console.log(items)});
//       } else {
//         console.log("could not get collection");
//       }
//     });
//   } else {
//     console.log("monog connect error");
//   }
// });

var myDb;

console.log("connect to mongo - " + mongohqurl)

MongoClient.connect(mongohqurl, function(err, db) {
  if(!err) {
    myDb = db;
  } else {
    console.log("initial mongo connect error");
    console.log(err)
  }
}); 

function foreachArtistCB(item, artistCallback) {

    item.testing = "hello";

    myDb.collection('artistVideos', function(err, collection) {
      if(!err) {

        // database querying
        collection.find({songkickId:item.artist.id}).toArray(function(err, items) {
          
          if (items==null) {
            console.log("mongo error: could not find items");
            artistCallback();
            return;
          }

          if (items.length > 0) {
            if (items[0].hasVideos === "true") {
              item.artist.youtubeID = items[0].videos[0].youtubeId;
            } else {
              console.log("no known videos for artist");
            }
            
            artistCallback();
          } else {
            // find videos

            var params = {
              part: 'id,snippet',
              q: item.artist.displayName,
              type: 'video',
              maxResults: '5',
              videoCategoryId:"10",
              videoDuration: "medium",
              'videoEmbeddable': true

            }

            youtube.search.list(params, (err, res) => {
              if( err ) {
                  console.log( "youtube feed error for "+item.artist.displayName+":" + err );
                  if (err.message === "not found") {
                    console.log("couldnt find artist on youtube, logging in db");

                    var insertData = {
                      songkickId:item.artist.id,
                      artistName:item.artist.displayName,
                      hasVideos:"false",
                    }

                    collection.insert(insertData, function(err, result) {
                      if (err) {
                        console.log("insert failed");
                      } else {
                        console.log("insert succeeded");
                      }
                    });
                  } else {
                    console.log( "unknown youtube feed error for "+item.artist.displayName+":" + err );
                  }
                  artistCallback();
              } else {

                  item.artist.youtubeID = res.data.items[0].id.videoId;
                  // // item.artist.youtubeURL = data.items[0].player.default;
                  artistCallback();

                  var insertData = {
                    songkickId:item.artist.id,
                    artistName:item.artist.displayName,
                    hasVideos:"true",
                    videos: [{
                              youtubeId:res.data.items[0].id.videoId, 
                              title:res.data.items[0].snippet.title, 
                              createTime:new Date().getTime(),
                              source:"youtubeAutoSearch"
                            }]
                  }

                  collection.insert(insertData, function(err, result) {
                    if (err) {
                      console.log("insert failed");
                    } else {
                      // console.log("insert succeeded");
                    }
                  });
              }
            });
          }
        });
      } else {
        console.log("could not get collection");
      }
    });
}

function idFromUrlString(string) {
    var matches = string.match(/([0-9]+)/);

    if (matches) {
      return matches[1];
    } else {
      // return "";
    }
}

function getFullUrlFromReq(req) {
  return fullURL = req.protocol + "://" + req.headers.host + req.url;
}

function getClientIp(req) {
  var ipAddress;
  // Amazon EC2 / Heroku workaround to get real client IP
  var forwardedIpsStr = req.header('x-forwarded-for'); 
  if (forwardedIpsStr) {
    // 'x-forwarded-for' header may return multiple IP addresses in
    // the format: "client IP, proxy 1 IP, proxy 2 IP" so take the
    // the first one
    var forwardedIps = forwardedIpsStr.split(',');
    ipAddress = forwardedIps[0];
  }
  if (!ipAddress) {
    // Ensure getting client IP address still works in
    // development environment
    ipAddress = req.connection.remoteAddress;
  }
  return ipAddress;
};

function foreachEventCB(item, eventCallback) {
  async.forEach(item.performance, foreachArtistCB, 
    function(err){
      if (err) {
        console.log("error iterating for youtube links: " + err);
      } else {
        // item.testval = "eventTesting!";
        eventCallback();
      }
// if any of the saves produced an error, err would equal that error
  });

  // console.log(item.displayName);
}

// app.get('/data/:type', function (req, res) {
//   console.log('Received ' + type + ' data');
// });

app.get('/data', function (req, res) {
  console.log('Received no path ' +  ' data');
  res.json({"data": "none"});
});


app.get('/event/:eventid/calendar.ics', function (req, res) {

  var options = {
    host: 'api.songkick.com',
    path: '/api/3.0/events/' + req.params.eventid + '.json?apikey=bUMFhmMfaIpxiUgJ'
  };


  http.get(options, function(skres) {
    var data = '';

    // console.log('STATUS: ' + skres.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(skres.headers));
    skres.on('data', function (chunk) {
      // console.log('BODY: ' + chunk);
      // response.write(chunk);
      data += chunk;
    });

    skres.on('end', function (chunk) {
      // console.log('BODY: ' + chunk);
      // data += chunk;
      if (chunk) {
        data += chunk;
      }

      // console.log(data);
      var songKickdata = JSON.parse(data);

      if (!(songKickdata.resultsPage.results)) {
        res.json({status:"error"});
        return;
      }

      var locationString = songKickdata.resultsPage.results.event.venue.displayName;

      if (songKickdata.resultsPage.results.event.venue.street) {
        locationString += " - " + songKickdata.resultsPage.results.event.venue.street;
      }

      var event = new icalendar.VEvent('cded25be-3d7a-45e2-b8fe-8d10c1f8e5a9');
      event.setSummary(songKickdata.resultsPage.results.event.displayName);
      // event.setSummary("a nwe event");
      event.setLocation(locationString);

      var endDate;

      if (songKickdata.resultsPage.results.event.end) {
        endDate = new Date(songKickdata.resultsPage.results.event.end.datetime);
      } else {
        endDate = new Date(songKickdata.resultsPage.results.event.start.datetime);
      }

      event.setDate(new Date(songKickdata.resultsPage.results.event.start.date +"T" + songKickdata.resultsPage.results.event.start.time + "Z"), endDate);

      console.log("start date: " + songKickdata.resultsPage.results.event.start.datetime);

      res.setHeader('Content-disposition', 'attachment; filename=' + "calendar.ics");
      res.setHeader('Content-type', "text/calendar");

      res.write(event.toString());
      res.end();
     // res.json({"data": "calendar"});s
    });
  });

 

  // res.writeHead(200, );

  // var fileStream = fs.createReadStream(filename);
  // fileStream.pipe(res);
});

// JSON responses
app.get('/venues/:venueid/calendar.json', function(request, response) {
  //response.send('Hello World!');
  //response.send('Hello World again!');
  // response.render('GigCast.html', {

  // var http = require('http');

  // response.setHeader('Cache-Control', 'public, max-age=' + oneHour);
  // console.log('HEADERS: ' + JSON.stringify(response.headers));

  var myClientIp = getClientIp(request);

  var queryStringParameterse = {
    apikey: "bUMFhmMfaIpxiUgJ"
  }

  if(request.query["min_date"]) {
    queryStringParameterse["min_date"] = request.query["min_date"];
  }

  if(request.query["max_date"]) {
    queryStringParameterse["max_date"] = request.query["max_date"];
  }

  if(request.query["page"]) {
    // console.log("page required");
    // response.json({status:"error", message:"page required"});
    queryStringParameterse["page"] = request.query["page"];
  }

  var myQueryString = qs.stringify(queryStringParameterse);

  // console.log(myQueryString);

  var venueId = request.params.venueid;

  var options = {
    host: 'api.songkick.com',
    path: '/api/3.0/venues/'+venueId+'/calendar.json?' + myQueryString
  };

  http.get(options, function(skres) {
    var data = '';

    // console.log('STATUS: ' + skres.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(skres.headers));
    skres.on('data', function (chunk) {
      // console.log('BODY: ' + chunk);
      // response.write(chunk);
      data += chunk;
    });

    skres.on('end', function (chunk) {
      // console.log('BODY: ' + chunk);
      // data += chunk;
      if (chunk) {
        data += chunk;
      }

      var songKickdata = JSON.parse(data);

      // BUG we errored out here somehow- if our results do not have any data
      // hardcoded to 50 per page
      if (songKickdata.resultsPage.totalEntries - (songKickdata.resultsPage.page -1) * songKickdata.resultsPage.perPage> 0) {
        // console.log(songKickdata.resultsPage.totalEntries);
        async.forEach(songKickdata.resultsPage.results.event, foreachEventCB, 
          function(err){
            if (err) {
              console.log("error iterating for youtube links: " + err);
            } else {
              // response.writeHead(200, {
              //   "Content-Type": "application/json",
              //   "Access-Control-Allow-Origin": "*"
              // });

              // response.write(JSON.stringify(songKickdata));
              // response.end;
              songKickdata.start = "helloyou";
              response.json(songKickdata);
            }
      // if any of the saves produced an error, err would equal that error
        });
      }else {
        response.json(songKickdata);
      }
    });

    // response.json({ 'testvar':"success"})
  }).on('error', function(e) {
    console.log('ERROR: ' + e.message);
    response.json({ 'testvar':"error"})
  });

  // response.json({ 'testvar':"default"})
});

// JSON responses
app.get('/events.json', function(request, response) {

  var myClientIp = getClientIp(request);

  if(!request.query["min_date"]) {
    console.log("min_date required");
    response.json({status:"error", message:"min_date required"});
    return;
  }

  if(!request.query["max_date"]) {
    console.log("max_date required");
    response.json({status:"error", message:"max_date required"});
    return;
  }

  if(!request.query["page"]) {
    // console.log("page required");
    // response.json({status:"error", message:"page required"});
    request.query["page"] = 1;
  }

  // TODO what location info does client pass in and how do we parse?
  if(!request.query["location"]) {
    console.log("location required");
    response.json({status:"error", message:"location required"});
    return;
  }

  var queryStringParameterse = {
    apikey: "bUMFhmMfaIpxiUgJ",
    min_date: request.query["min_date"],
    max_date: request.query["max_date"],
    page: request.query["page"],
    location: request.query["location"]
  }

  if (queryStringParameterse.location == "clientip") {
    // better way to test for our own host?
    if (myClientIp == "127.0.0.1") {
      // console.log("loc=clientip our self???");
    } else {
        // console.log("change client IP to actual IP");
        queryStringParameterse.location = "ip:" + myClientIp;
    }
  }

  var myQueryString = qs.stringify(queryStringParameterse);

  // console.log(myQueryString);

  var options = {
    host: 'api.songkick.com',
    path: '/api/3.0/events.json?' + myQueryString
  };

  http.get(options, function(skres) {
    var data = '';

    // console.log('STATUS: ' + skres.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(skres.headers));
    skres.on('data', function (chunk) {
      // console.log('BODY: ' + chunk);
      // response.write(chunk);
      data += chunk;
    });

    skres.on('end', function (chunk) {
      // console.log('BODY: ' + chunk);
      // data += chunk;
      if (chunk) {
        data += chunk;
      }

      var songKickdata = JSON.parse(data);

      // BUG we errored out here somehow- if our results do not have any data
      // hardcoded to 50 per page
      if (songKickdata.resultsPage.totalEntries - (songKickdata.resultsPage.page -1) * songKickdata.resultsPage.perPage> 0) {
        // console.log(songKickdata.resultsPage.totalEntries);
        async.forEach(songKickdata.resultsPage.results.event, foreachEventCB, 
          function(err){
            if (err) {
              console.log("error iterating for youtube links: " + err);
            } else {
              // response.writeHead(200, {
              //   "Content-Type": "application/json",
              //   "Access-Control-Allow-Origin": "*"
              // });

              // response.write(JSON.stringify(songKickdata));
              // response.end;
              songKickdata.start = "helloyou";
              response.json(songKickdata);
            }
      // if any of the saves produced an error, err would equal that error
        });
      }else {
        response.json(songKickdata);
      }
    });

    // response.json({ 'testvar':"success"})
  }).on('error', function(e) {
    console.log('ERROR: ' + e.message);
    response.json({ 'testvar':"error"})
  });

  // response.json({ 'testvar':"default"})
});

function calendarEventCBWrapper(data, eventCallback) {
  foreachEventCB(data.event, eventCallback);
}

app.get('/users/:username/calendar.json', function(request, response) {
  //response.send('Hello World!');
  //response.send('Hello World again!');
  // response.render('GigCast.html', {

  // var http = require('http');

  if(!request.query["page"]) {
    request.query["page"] = "1";
  }

  if(!request.query["reason"]) {
    console.log("reason required");
    response.json({status:"error", message:"reason required"});
    return;
  }

  var queryStringParameterse = {
    apikey: "bUMFhmMfaIpxiUgJ",
    page: request.query["page"],
    reason: request.query["reason"]
  }

  var myQueryString = qs.stringify(queryStringParameterse);

  // console.log(myQueryString);

  var options = {
    host: 'api.songkick.com',
    path: '/api/3.0/users/' + request.params.username + '/calendar.json?' + myQueryString
  };

  // console.log(options.host + options.path);

  http.get(options, function(skres) {
    var data = '';

    // console.log('STATUS: ' + skres.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(skres.headers));
    skres.on('data', function (chunk) {
      // console.log('BODY: ' + chunk);
      // response.write(chunk);
      data += chunk;
    });

    skres.on('end', function (chunk) {
      // console.log('BODY: ' + chunk);
      // data += chunk;
      if (chunk) {
        data += chunk;
      }

      var songKickdata = JSON.parse(data);


      if (songKickdata.resultsPage.totalEntries - (songKickdata.resultsPage.page -1) * songKickdata.resultsPage.perPage> 0) {
        async.forEach(songKickdata.resultsPage.results.calendarEntry, calendarEventCBWrapper, 
          function(err){
            if (err) {
              console.log("error iterating for youtube links: " + err);
            } else {
              // response.writeHead(200, {
              //   "Content-Type": "application/json",
              //   "Access-Control-Allow-Origin": "*"
              // });

              // response.write(JSON.stringify(songKickdata));
              // response.end;
              response.json(songKickdata);
            }
      // if any of the saves produced an error, err would equal that error
        });
      } else {
        response.json(songKickdata);
      }
    });

    // response.json({ 'testvar':"success"})
  }).on('error', function(e) {
    console.log('ERROR: ' + e.message);
    response.json({ 'testvar':"error"})
  });

  // response.json({ 'testvar':"default"})
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});