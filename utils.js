const OSApi  = require('opensubtitles-api')
const api    = new OSApi("NodeOpensubtitles v0.0.1");
const lodash = require('lodash');
const url    = require("url");

exports.api = api;
exports.subtitleTransform = function (results, host, query) {
  const keys = Object.keys(results)
  const values = keys.map(lang => results[lang])
  .map(group => {
    return [group].map((subs, index) => {
      const {imdbid, season, episode} = query;
      const lang = subs.langcode;
      subs.links = { 
        srt: subs.url,
        vtt: url.format({
          host: `//${host}/`,
          pathname: 'convert',
          query: {imdbid, season, episode, lang}
        })
      };
      delete subs.url;
      return subs;
    });
  });
  return lodash.zipObject(keys, values);
}
