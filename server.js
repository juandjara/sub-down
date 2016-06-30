var express = require('express');
var favicon = require('express-favicon');
var app  = express();
var cors = require('cors');
var path = require('path');
var OpenSubs = require('opensubtitles-universal-api');
var got = require("got");
var srt2vtt = require("srt2vtt");
var fs = require("fs");

function login() {
  return subsapi.login().then(function (token) {
    return token;
  }, function (err) {
    console.error('There was an error in login: \n' + err);
  });
}

function search(imdbid, season, episode){
  var UA  = "NodeOpensubtitles v0.0.1";
  var api = new OpenSubs(UA);

  var query = { imdbid:imdbid, season:season, episode:episode };

  return api.search(query);
}

app.set('json spaces', 2);
app.use(cors());

app.get('/search', function (req, res) {
  var imdbid = req.query.imdbid;
  var season = req.query.season;
  var episode = req.query.episode;
  
  if(!(imdbid && season && episode)){
    return res.status(400).send("Bad request. Missing parameters");
  }

  search(imdbid, season, episode).then(onSearchSuccess, onSearchError);

  function onSearchSuccess(results) {
    res.json(results);
  }
  function onSearchError(err) {
    throw err;
  }
});

app.get('/search-convert', function (req, res) {
  var imdbid = req.query.imdbid;
  var season = req.query.season;
  var episode = req.query.episode;
  var lang    = req.query.lang;
  
  if(!(imdbid && season && episode && lang)){
    return res.status(400).send("Bad request. Missing parameters");
  }

  search(imdbid, season, episode).then(onSearchSuccess, onSearchError);

  function onSearchSuccess(results) {
    if(!results){
      return res.status(404).send("Not found");
    }else{
      var subs_data = results[lang][0];
      got(subs_data.url, { encoding: null })
        .then(function(srt){
          srt2vtt(srt.body, function(err, vtt){
            if(err) throw new Error(err);
            res.send(vtt);
          })
        });
    }
  }
  function onSearchError(err) {
    throw err;
  }
})

app.use(favicon(__dirname + '/static/favicon.ico'));
app.use(express.static("static"));

var server = app.listen(process.env.PORT || 4000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});
