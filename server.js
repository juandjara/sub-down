var express = require('express');
var favicon = require('express-favicon');
var app  = express();
var cors = require('cors');
var path = require('path');
var OpenSubs = require('opensubtitles-universal-api');

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
    return res.status(400).send("Bad request");
  }

  search(imdbid, season, episode).then(onSearchSuccess, onSearchError);

  function onSearchSuccess(results) {
    res.json(results);
  }
  function onSearchError(err) {
    res.json({ status: 'error', error: err });
  }
});

app.use(favicon(__dirname + '/static/favicon.ico'));
app.use(express.static("static"));

var server = app.listen(process.env.PORT || 4000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});
