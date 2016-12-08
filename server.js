var express  = require('express');
var favicon  = require('express-favicon');
var app      = express();
var cors     = require('cors');
var OpenSubs = require('opensubtitles-universal-api');
var got      = require("got");
var srt2vtt  = require("srt2vtt");
var url      = require("url");
var gzip     = require("compression");
var lodash   = require("lodash");

function search(imdbid, season, episode){
  var UA  = "NodeOpensubtitles v0.0.1";
  var api = new OpenSubs(UA);

  var query = { imdbid:imdbid, season:season, episode:episode };

  return api.search(query);
}

app.set('json spaces', 2);
app.use(cors());
app.use(gzip());

app.get('/search', function (req, res) {
  var imdbid = req.query.imdbid;
  var season = req.query.season;
  var episode = req.query.episode;
  var host = req.get("host");
  var hostLastChar = host.slice(-1);
  if (hostLastChar !== "/") {
    host += "/";
  }

  if(!(imdbid && season && episode)){
    return res.status(400).send("Bad request. Missing parameters");
  }

  console.log("search: start");  
  var startTime = Date.now();
  search(imdbid, season, episode).then(onSearchSuccess, onSearchError);

  function getConvertLink(host, imdbid, episode, season, lang, index){
    return url.format({
      host:     host,
      pathname: 'convert',
      query: { imdbid, episode, season, lang, index }
    });
  }

  function onSearchSuccess(results) {
    var endTime = Date.now();
    console.log("search: finished");
    console.log("search: it took "+(endTime-startTime)+" ms");
    var keys   = Object.keys(results); 
    var values = keys.map(function (lang){
      var value = results[lang];
      return value.map(function(subs, index){
        var vtt = getConvertLink(imdbid, episode, season, lang, index);
        subs.name = subs.releaseFilename;
	subs.links = {
          vtt: vtt,
          srt: subs.url
        }
        delete subs.url;
	delete subs.releaseFilename;
	delete subs.subFilename;
        return subs;
      });
    });
    var mapped = lodash.zipObject(keys, values);
    res.json(mapped);
  }
  function onSearchError(err) {
    throw err;
  }
});

app.get('/convert', function (req, res) {
  var imdbid = req.query.imdbid;
  var season = req.query.season;
  var episode = req.query.episode;
  var lang    = req.query.lang;
  var index   = req.query.index;
  
  if(!(imdbid && season && episode && lang)){
    return res.status(400).send("400 Bad request. Missing parameters");
  }

  search(imdbid, season, episode).then(onSearchSuccess, onSearchError);

  function onSearchSuccess(results) {
    if(!results){
      return res.status(404).send("404 Subtitles not found");
    }else{
      var subs_data = results[lang];
      if(!subs_data){ 
        return res.status(404).send("404 Subtitles not found for lang "+lang);
      }

      index = index || 0; // default index is 0 if no index Fas passed in the url
      index = parseInt(index, 10);
      var sub_data = subs_data[index];
      if(!sub_data){
        return res.status(404).send("404 Subtitles not found for index "+req.query.index);        
      }

      got(sub_data.url, { encoding: null })
        .then(function(srt){
          srt2vtt(srt.body, function(err, vtt){
            if(err) throw new Error(err);

            res.type("text/vtt");
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
