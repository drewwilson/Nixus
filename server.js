/**
 * server.js
 * Dialog.gs application server
 *
 * @author Amir Malik
 */

require.paths.unshift('../../vendor/connect/lib');

var connect     = require('connect'),
    MemoryStore = require('connect/middleware/session/memory');

var common    = require('./common'),
    datastore = require('./datastore').DataStore;

function rootHandler(app) {
  app.get('/', function(req, res, next) {
    common.sendFile(res, __dirname + '/../../public/index.html');
  });
}

function apiHandler(app) {
  app.get('/api/hello', function(req, res, next) {
    res.writeHead(200);
    res.end('hello');
  });
}

datastore.init('localhost', 27017, 'dialoggs');
datastore.connect(function() {
  var server = connect.createServer(
    // log HTTP requests
    connect.logger(),

    // decode application/x-www-form-urlencoded and application/json requests
    connect.bodyDecoder(),

    // populate req.cookies
    connect.cookieDecoder(),

    // seesion cookies
    connect.session({store: new MemoryStore({reapInterval: 5 * 60 * 1000}), secret: "SuperSecretSessionSeed"}),

    // contitional GET requests
    connect.conditionalGet(),

    // handle /
    connect.router(rootHandler),

    // merge static files into /
    connect.staticProvider({root: __dirname + '/../public', maxAge: 1000}),

    // handle /api/
    connect.router(apiHandler),

    // errors
    connect.errorHandler({showStack: true})
  );
  server.listen(8080);
});
