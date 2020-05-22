const OSApi = require('opensubtitles-api')
const api = new OSApi('Popcorn Time NodeJS');
const url = require('url');

exports.api = api;
exports.subtitleTransform = function (results, host, query) {
  return Object.fromEntries(Object.entries(results)
    .map(group => {
      const [key, subs] = group
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
      return [key, [subs]];
    }));
}
