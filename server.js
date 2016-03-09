var opensubtitles = require('subtitler');
var subsapi       = opensubtitles.api;
var express       = require('express');
var app           = express();
var cors          = require('cors');
var path          = require('path');

function login(){
    return subsapi.login().then(function(token){
        return token;
    }, function(err){
        console.error('There was an error in login: \n'+err);
    });
}

/* limit:    how many results to send to client
 * language: language of the subtitles
 * params:   possible search parameters:
 *  - imdbid
 *  - query
 *  - season
 *  - episode
 *
 * If imdbid is defined, then query is ignored.
 * If query is defined, then imdbid is ignored.
 */
function search(limit, language, params){
    var language = language || 'spa';
    return function(token){
        return subsapi.search(token, language, params)
            .then(function(results){
                var parsed_results = results.map(function(result){
                    var new_result = {};
                    try{
                        new_result = {
                            sub_file_name:   result.SubFileName,
                            sub_lang_id:     result.SubLangId,
                            sub_format:      result.SubFormat,
                            sub_upload_date: result.SubAddDate,
                            sub_bad:         result.SubBad,
                            rating:          result.SubRating,
                            imdb_rating:     result.MovieImdbRating,
                            imdb_id:         result.IDMovieImdb,
                            imdb_parent_id:  result.SeriesIMDBParent,
                            downloads_count: result.SubDownloadsCnt,
                            release_name:    result.MovieReleaseName,
                            name:            result.MovieName,
                            FPS:             result.MovieFPS,
                            year:            result.MovieYear,
                            language:        result.LanguageName,
                            season:          result.SeriesSeason,
                            episode:         result.SeriesEpisode,
                            kind:            result.MovieKind,
                            zip_download:    result.ZipDownloadLink,
                            sub_download:    result.SubDownloadLink
                        };
                    }catch(err){
                        console.error('Error mapping search results: \n'+err);
                        new_result = {status:'error', error: err};
                    }finally{
                        return new_result;
                    }
                });
                parsed_results.sort(function(res1, res2){
                    var ep_number_1 = (res1.episode < 10 ? '0' : '') + res1.episode;
                    var ep_number_2 = (res2.episode < 10 ? '0' : '') + res2.episode;
                    var id1 = parseInt(""+res1.season+ep_number_1);
                    var id2 = parseInt(""+res2.season+ep_number_2);
                    if(id1 < id2)      return -1;
                    else if(id1 > id2) return  1;
                    else               return  0;
                });
                parsed_results = parsed_results.slice(0, limit);
                return {token: token, status:'ok', length: parsed_results.length, results: parsed_results}
            }, function(err){
                console.error('Error searching in the api: \n'+err);
                return {token: token, status: 'error', error: err};
            });
    }
}

app.set('json spaces', 2);
app.use(cors());
app.get('/', function (req, res) {
  login().then(function(token){
    if(token) response = {status: 'ok'};
    else      response = {status: 'error', error: 'Error calling login. No token received'};
    response.description = 'API for searching in opensubtitles.org. See /help for more info.';
    res.json(response);
    return token;
  }, function(err){
    res.json({status: 'error', error: err});
    return '';
  }).then(subsapi.logout);
});

app.get('/help', function(req, res){
    res.sendFile(path.join(__dirname, 'help.html'));
});

app.get('/search', function(req, res){
    var query   = req.query.query;
    var imdbid  = req.query.imdbid;
    var season  = req.query.season;
    var episode = req.query.episode;
    var limit   = req.query.limit;
    var lang    = req.query.lang;
    login()
      .then(search(limit, lang, {'query':query, imdbid: imdbid, season: season, episode: episode}))
      .then(function(results){
        var token = results.token;
        if(token) results.token = 'ok';
        else      results.token = 'error. blank token.';
        res.json(results);
        return token;
    }, function(err){
        console.error('There was an error calling search: \n'+err);
        res.json({status: 'error', error: err});
    }).then(subsapi.logout);
});


var server = app.listen(4000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('app listening at http://%s:%s', host, port);
});
