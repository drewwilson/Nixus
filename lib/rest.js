/**
 * rest.js
 * REST endpoints
 *
 * @author Amir Malik
 */

var url = require('url');

var connect = require('../../vendor/connect');

var DataStore = require('./datastore').DataStore,
       common = require('./common');

function REST() {
}

REST.prototype.get = function(req, res, next) {
  var collection = req.params.collection,
              id = req.params.id,
           query = url.parse(req.url, true).query;

  var where = query || {}
  var count = 0;

  if(id) {
    where['id'] = id;
  }

  console.log(JSON.stringify(where));

  DataStore.queryAll(collection, where, function(err, results) {
    if(err) {
      console.log("REST.get error: " + err);
      throw err;
    }

    req.nixus.data = [];

    if(id) {
      if(results.length == 0) {
        req.nixus.data = null;
      } else {
        req.nixus.data = req.nixus.process(SaltService.trimHidden(collection, results[0]), req, res);
      }
    } else {
      req.nixus.data = [];
      for(var i = 0; i < results.length; i++) {
        req.nixus.data.push(req.nixus.process(SaltService.trimHidden(collection, results[i]), req, res));
      }
    }
    next();
  });
};

REST.prototype.put = function(req, res, next) {
  var collection = req.params.collection,
              id = req.params.id;

  var doc = SaltService.trimReadOnly(collection, req.body);
  var where = {
    id: id,
  };

  DataStore.update(collection, where, doc, function(err) {
    if(err) {
      console.log("REST.put error: " + err);
      throw err;
    }

    next();
  });
};

REST.prototype.post = function(req, res, next) {
  var collection = req.params.collection,
              id = req.params.id;

  var doc = req.body;
  doc = req.nixus.process(SaltService.trimReadOnly(collection, doc), req, res);

  DataStore.insert(collection, doc, function(err, doc) {
    if(err)
      throw err;

    console.log("REST.post inserted doc with id: " + doc['id']);

    req.nixus.data = SaltService.trimHidden(collection, doc);
    next();
  });
};

REST.prototype.del = function(req, res, next) {
  var collection = req.params.collection,
              id = req.params.id;

  var where = {
    id: id,
  };

  DataStore.remove(collection, where, function(err) {
    if(err)
      throw err;

    console.log("REST.delete succeeded for id: " + id);

    next();
  });
};

exports.REST = global['REST'] || (global['REST'] = new REST());
