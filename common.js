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

exports.sendFile = sendFile;
