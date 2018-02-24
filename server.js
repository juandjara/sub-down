const express  = require('express');
const app      = express();
const favicon  = require('express-favicon');
const cors     = require('cors');
const gzip     = require('compression');
const apicache = require('apicache');
const got      = require('got');
const srt2vtt  = require('srt2vtt');
const utils    = require('./utils')

app.set('json spaces', 2);
app.use(cors());
app.use(gzip());
const cache = apicache.middleware('2 hours');

app.get('/search', cache, (req, res) => {
  if(!req.query.imdbid && 
     !req.query.episode && 
     !req.query.season){
    res.status(400).send("Bad request. Query must contain imdbid, season and episode");
    return;
  }

  const startTime = Date.now();
  utils.api.search(req.query).then(results => {
    const endTime = Date.now();
    console.log(`Subtitle search took ${endTime - startTime} ms`);
    const data = utils.subtitleTransform(
      results,
      req.get('host'),
      req.query
    );
    res.json(data);
  }).catch(err => {
    console.error(err);
    res.status(500).send(err.message);
  });
});

app.get('/convert', cache, (req, res) => {
  if(!req.query.imdbid && 
     !req.query.episode && 
     !req.query.season &&
     !req.query.lang){
    res.status(400).send("Bad request. Query must contain imdbid, lang, season and episode");
    return;
  }

  utils.api.search(req.query).then(results => {
    const lang = req.query.lang;
    const subs = results && results[lang]
    if(!subs){
      res.status(404).send("404 Subtitles not found");
      return;
    }

    got(subs.url, { encoding: null }).then(srt => {
      srt2vtt(srt.body, (err, vtt) => {
        if(err) {
          console.error(err);
          res.status(500).send(err.message);
          return;
        }
        res.type("text/vtt");
        res.send(vtt);
      })
    });
  }).catch(err => {
    console.error(err);
    res.status(500).send(err.message);
  });
})

app.get('/textsearch', (req, res) => {
  const query = {query: req.query.q};
  utils.api.search(query)
  .then(subs => utils.subtitleTransform(subs, req.get('host'), query))
  .then(subs => res.json(subs))
  .catch(err => {
    console.error(err)
    res.status(500).send(err.message);
  })
})

app.use(favicon(__dirname + '/static/favicon.ico'));
app.use(express.static("static"));

const server = app.listen(process.env.PORT || 4000, () => {
  const host = server.address().address;
  const port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});

module.exports = {app, server};
