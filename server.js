const express = require('express');
const app = express();
const favicon = require('express-favicon');
const cors = require('cors');
const got = require("got");
const url = require("url");
const gzip = require("compression");
const lodash = require("lodash");
const apicache = require("apicache");
const srt2vtt = require("srt2vtt");
const OpenSubs = require('opensubtitles-universal-api');
const OpenSubs2 = require('opensubtitles-api')

function textSearch(query) {
  const OS = new OpenSubs2("NodeOpensubtitles v0.0.1");
  return OS.search({
    query,
    extensions: ['srt','vtt']
  })
}

function search(imdbid, season, episode){
  const api = new OpenSubs("NodeOpensubtitles v0.0.1");
  const query = { imdbid, season, episode };

  return api.search(query);
}

function getConvertLink(req, lang, index){
  const { imdbid, season, episode } = req.query;
  return url.format({
    host: "//"+req.get("host")+"/",
    pathname: 'convert',
    query: { imdbid, episode, season, lang, index }
  });
}

function subtitleTransform(results, req) {
  const keys = Object.keys(results); 
  const values = keys.map((lang) => {
    return results[lang].map((subs, index) => {
      const srt = subs.url;
      const vtt = getConvertLink(req, lang, index);
      subs.name = subs.releaseFilename;
      subs.links = { vtt, srt };
      delete subs.url;
      delete subs.releaseFilename;
      delete subs.subFilename;
      return subs;
    });
  });
  return lodash.zipObject(keys, values);
}

app.set('json spaces', 2);
app.use(cors());
app.use(gzip());
const cache = apicache.middleware('2 hours');

app.get('/search', cache, (req, res) => {
  const { imdbid, season, episode } = req.query;
  const allParamsPresent = imdbid && season && episode;
  if(!allParamsPresent){
    return res
      .status(400)
      .send("Bad request. Query must contain imdbid, season and episode");
  }

  const startTime = Date.now();
  search(imdbid, season, episode).then(results => {
    const endTime = Date.now();
    console.log(`Subtitle search took ${endTime-startTime} ms`);
    const subs = subtitleTransform(results, req);
    res.json(subs);
  }, err => { throw new Error(err); });
});

app.get('/convert', cache, (req, res) => {
  const { imdbid, season, episode, lang, index } = req.query;
  const allParamsPresent = imdbid && season && episode && lang;
  if(!allParamsPresent){
    return res
      .status(400)
      .send("Bad request. Query must contain imdbid, lang, season and episode");
  }

  search(imdbid, season, episode).then(results => {
    const idx = parseInt(index || 0);
    if(!results || !results[lang] || !results[lang][idx]){
      return res
        .status(404)
        .send("404 Subtitles not found");
    }

    got(results[lang][index].url, { encoding: null })
    .then(function(srt){
      srt2vtt(srt.body, function(err, vtt){
        if(err) throw new Error(err);
        res.type("text/vtt");
        res.send(vtt);
      })
    });
  }, err => { throw new Error(err) });
})

app.get('/textsearch', (req, res) => {
  const query = req.query.q;
  textSearch(query, req)
  .then(data => {
    const subs = lodash.groupBy(data, 'langcode')
    return subtitleTransform(subs, req)
  })
  .then(subs => res.json(subs))
})

app.use(favicon(__dirname + '/static/favicon.ico'));
app.use(express.static("static"));

const server = app.listen(process.env.PORT || 4000, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});
