/**
 * datastore.js
 * Datastore layer
 *
 * @author Amir Malik
 */

var mongodb = require('../../vendor/node-mongodb-native/lib/mongodb');
var Db = mongodb.Db,
    Connection = mongodb.Connection,
    Server = mongodb.Server,
    BSON = mongodb.BSONPure;
    //BSON = mongodb.BSONNative;

var SaltService = require('./security').SaltService;

function DataStore() {
  this.connection = null;
  this.db = null;
  this.init.apply(this, arguments);
}

DataStore.prototype.init = function init(host, port, name) {
  this.host = host;
  this.port = port;
  this.name = name;
};

DataStore.prototype.connect = function connect(cb) {
  var self = this;
  var opt = {
    native_parser: false,
    auto_reconnect: true,
  };

  this.connection = new Server(this.host, this.port, opt);
  this.db = new Db(this.name, this.connection, {});

  this.db.addListener('error', function(err) {
    // TODO: handle network errors
    console.log('DataStore error: ' + JSON.stringify(err));
  });

  this.db.addListener('close', function(conn) {
    console.log('DataStore closed connection: ' + conn);
  });

  this.db.open(function(err, db) {
    cb();
  });
};

DataStore.prototype.clearCollection = function clearCollection(collection, cb) {
  this.db.collection(collection, function(err, c) {
    c.remove(function(err, c) {
      cb(err);
    });
  });
};

DataStore.prototype.query = function query(collection, where, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      cb(err);
      return;
    }

    where = SaltService.encrypt(collection, where);

    if('_id' in where)
      where['_id'] = new BSON.ObjectID(where['_id']);

    c.find(where, function(err, cursor) {
      if(err) {
        console.log('cursor error: ' + err);
        cb(err);
        return;
      }

      cursor.nextObject(function(err, doc) {
        if(err) {
          console.log('cursor navigation error: ' + err);
          cb(err);
          return;
        }

        doc = SaltService.decrypt(collection, doc);

        cb(null, doc);
      });
    });
  });
};

DataStore.prototype.queryAll = function queryAll(collection, where, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error performing queryAll on ' + collection + ': ' + err);
      cb(err);
      return;
    }

    where = SaltService.encrypt(collection, where);

    if('_id' in where)
      where['_id'] = new BSON.ObjectID(where['_id']);

    console.log("where claused: " + JSON.stringify(where));

    c.find(where, function(err, cursor) {
      if(err) {
        console.log('error on find: ' + err);
        cb(err);
        return;
      }

      cursor.toArray(function(err, results) {
        if(err) {
          console.log('error calling cursor.toArray: ' + err);
          cb(null);
          return;
        }

        for(var i = 0; i < results.length; i++) {
          results[i] = SaltService.decrypt(collection, results[i]);
        }

        console.log('found ' + results.length + ' results');
        cb(null, results);
      });
    });
  });
};

DataStore.prototype.insert = function insert(collection, doc, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(err);
    }

    doc = SaltService.encrypt(collection, doc);

    c.insert(doc, function(docs) {
      cb(null, doc);
    });
  });
};

DataStore.prototype.update = function update(collection, where, update, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(null);
    }

    where = SaltService.encrypt(collection, where);
    update = SaltService.encrypt(collection, update);

    c.update(where, {'$set': update}, function(err, result) {
      cb(err);
    });
  });
};

DataStore.prototype.remove = function remove(collection, where, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(err);
    }

    c.remove(where, {}, function(err) {
      if(err) {
        console.log('error removing from ' + collection + ' where ' + JSON.stringify(where));
        return cb(err);
      }

      cb();
    });
  });
};

exports.DataStore = global['DataStore'] || (global['DataStore'] = new DataStore());
