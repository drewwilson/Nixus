/**
 * common.js
 * Useful utils
 *
 * @author Amir Malik
 */

var fs = require('fs');

function sendFile(res, file, contentType) {
  fs.readFile(file, function(err, data) {
    if(err) {
      res.writeHead(500, {
        'Content-Type': 'text/plain',
        'Content-Length': (''+err).length
      });
      res.end(''+err);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType ? contentType : 'text/html',
      'Content-Length': data.length
    });

    res.end(data, 'utf8');
  });
}

var SHORTEN_DICTIONARY = 'abcdefghijklmnopqrstuvwxyz0123456789';

function shortenId(n) {
  if(typeof n === 'string')
    n = parseInt(n, 10);

  var result = '';
  for(var i = 0; n > 0; n = Math.floor(n / SHORTEN_DICTIONARY.length)) {
    result = SHORTEN_DICTIONARY[n % SHORTEN_DICTIONARY.length] + result;
  }

  return result;
}

function unshortenId(s) {
  var result = 0;

  for(var i = 0; i < s.length; i++) {
    result += SHORTEN_DICTIONARY.indexOf(s[i]) * Math.pow(SHORTEN_DICTIONARY.length, s.length - i - 1);
  }

  return result;
}

exports.sendFile = sendFile;
exports.shortenId = shortenId;
exports.unshortenId = unshortenId;
