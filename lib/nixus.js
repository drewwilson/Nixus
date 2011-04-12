/**
 * server.js
 * Dialog.gs application server
 *
 * @author Amir Malik
 */

require.paths.unshift(__dirname + '/../vendor/connect/lib');
require.paths.unshift(__dirname + '/../vendor/connect/support');

var connect     = require('connect'),
    MemoryStore = connect.session.MemoryStore;

var common    = require('./common'),
    DataStore = require('./datastore').DataStore,
    security  = require('./security').SaltService;

var custom_handlers = {};

function Nixus(config, webroot) {
  this.config = config;
  this.webroot = webroot;
  this.handlers = {};
}

Nixus.prototype.addHandler = function(collection, m) {
  this.handlers[collection] = m;
};

Nixus.prototype.makeRootHandler = function() {
  var self = this;

  return function(app) {
    app.get('/', function(req, res, next) {
      common.sendFile(res, self.webroot + '/index.html');
    });
  };
};

Nixus.prototype.setupRequest = function(req, res, next) {
  console.log("setupRequest(): collection=" + req.params.collection + " id=" + req.params.id)

  var defaultBefore = function(req, res, next) {
    next();
  };
  var defaultProcess = function(doc, req, res) {
    return doc;
  };
  var defaultAfter = function(req, res, next) {
    if(req.method == 'POST') {
      res.writeHead(200);

      var doc = {
        _id: req.nixus.data['_id'],
      };

      res.end(JSON.stringify(doc), 'utf8');
    } else {
      next();
    }
  };

  var h = this.handlers[req.params.collection] || {};

  req.nixus = {
    before: h.before || defaultBefore,
    process: h.process || defaultProcess,
    after: h.after || defaultAfter,
  };
};

Nixus.prototype.getHandler = function() {
  var self = this;

  return function(req, res, next) {
    self.setupRequest(req, res, next);
    req.nixus.before(req, res, function() {
      REST.get(req, res, next);
    });
  };
};

Nixus.prototype.postHandler = function() {
  var self = this;

  return function(req, res, next) {
    self.setupRequest(req, res, next);
    req.nixus.before(req, res, function() {
      REST.post(req, res, next);
    });
  };
};

Nixus.prototype.putHandler = function() {
  var self = this;

  return function(req, res, next) {
    self.setupRequest(req, res, next);
    req.nixus.before(req, res, function() {
      REST.put(req, res, next);
    });
  };
};

Nixus.prototype.delHandler = function() {
  var self = this;

  return function(req, res, next) {
    self.setupRequest(req, res, next);
    req.nixus.before(req, res, function() {
      REST.del(req, res, next);
    });
  };
};

Nixus.prototype.createPostProcessors = function() {
  return function(req, res, next) {
    if(req.nixus) {
      req.nixus.after(req, res, next);
    } else {
      next();
    }
  };
};

Nixus.prototype.createSerializer = function() {
  return function(req, res, next) {
    if(req.nixus) {
      var headers = {};
      var body;
      var status = 200;

      if(req.nixus.data instanceof Array) {
        var result = {
          count: req.nixus.data.length,
          items: req.nixus.data,
        };

        body = JSON.stringify(result);
      } else {
        if(req.nixus.data) {
          body = JSON.stringify(req.nixus.data);
        } else {
          status = 404;
        }
      }

      if(body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = !!body ? body.length : 0;
      }

      res.writeHead(status, headers);

      if(body)
        res.end(body, 'utf8');
      else
        res.end();
    } else {
      next();
    }
  };
};

Nixus.prototype.createEntryPoints = function(app) {
  var self = this;

  return function(app) {
    app.get('/api/:collection', self.getHandler());
    app.get('/api/:collection/:id', self.getHandler());

    app.post('/api/:collection', self.postHandler());
    app.post('/api/:collection/:id', function(req, res, next) {
      res.writeHead(405);
      res.end();
    });

    app.put('/api/:collection', function(req, res, next) {
      res.writeHead(405);
      res.end();
    });
    app.put('/api/:collection/:id', self.putHandler());

    app.del('/api/:collection', function(req, res, next) {
      res.writeHead(405);
      res.end();
    });
    app.del('/api/:collection/:id', self.delHandler());
  };
};

Nixus.prototype.run = function run(cb) {
  var self = this;
  var port = this.config.port || 8000;
  var dsconf = this.config.datastore;
  var session_secret = this.config.session.secret;

  DataStore.init(dsconf.host, dsconf.port, dsconf.name);
  security.init(this.config.security);

  DataStore.connect(function() {
    var server = connect.createServer(
      // log HTTP requests
      connect.logger(),

      // decode application/x-www-form-urlencoded and application/json requests
      connect.bodyParser(),

      // populate req.cookies
      connect.cookieParser(),

      // seesion cookies
      connect.session({store: new MemoryStore({reapInterval: 5 * 60 * 1000}), secret: session_secret}),

      // handle /
      connect.router(self.makeRootHandler()),

      // merge static files into /
      connect.static(self.webroot, {maxAge: 1000}),

      // handle /api/
      connect.router(self.createEntryPoints()),
      self.createPostProcessors(),
      self.createSerializer(),

      // errors
      connect.errorHandler({showStack: true})
    );
    server.listen(port);
    cb();
  });
};

exports.Nixus = Nixus;
