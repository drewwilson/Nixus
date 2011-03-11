/**
 * datastore.js
 * Datastore layer
 *
 * @author Amir Malik
 */

var mongodb = require(__dirname + '/../vendor/node-mongodb-native/lib/mongodb');
var Db = mongodb.Db,
    Connection = mongodb.Connection,
    Server = mongodb.Server,
    BSON = mongodb.BSONPure;
    //BSON = mongodb.BSONNative;

var SaltService = require('./security').SaltService,
         common = require('./common');

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

    if('id' in where)
      where['id'] = common.unshortenId(where['id']);
    else if('_id' in where)
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
        doc['id'] = common.shortenId(doc['id']);

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

    if('id' in where)
      where['id'] = common.unshortenId(where['id']);
    else if('_id' in where)
      where['_id'] = new BSON.ObjectID(where['_id']);

    console.log("where clause: " + JSON.stringify(where));

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
          results[i]['id'] = common.shortenId(results[i]['id']);
          results[i] = SaltService.decrypt(collection, results[i]);
        }

        console.log('found ' + results.length + ' results');
        cb(null, results);
      });
    });
  });
};

DataStore.prototype.insert = function insert(collection, doc, cb) {
  var self = this;

  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(err);
    }

    doc = SaltService.encrypt(collection, doc);

    self.nextId(collection, function(err, id) {
      if(err) {
        console.log('failed to increment id. error: ' + err);
        return cb(err);
      }

      doc['id'] = id;

      c.insert(doc, function(docs) {
        doc['id'] = common.shortenId(doc['id']);
        cb(null, doc);
      });
    });
  });
};

DataStore.prototype._update = function _update(collection, where, update, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(null);
    }

    c.update(where, update, function(err, result) {
      cb(err, result);
    });
  });
};

DataStore.prototype.update = function update(collection, where, update, cb) {
  if('id' in where)
    where['id'] = common.unshortenId(where['id']);
  else if('_id' in where)
    where['_id'] = new BSON.ObjectID(where['_id']);

  where = SaltService.encrypt(collection, where);
  update = SaltService.encrypt(collection, update);

  this._update(collection, where, {'$set': update}, cb);
};

DataStore.prototype.increment = function increment(collection, where, field, cb) {
  if('id' in where)
    where['id'] = common.unshortenId(where['id']);
  else if('_id' in where)
    where['_id'] = new BSON.ObjectID(where['_id']);

  where = SaltService.encrypt(collection, where);

  var update = {};
  update['$inc'] = {};
  update['$inc'][field] = 1;

  this._update(collection, where, update, cb);
};

DataStore.prototype.decrement = function decrement(collection, where, field, cb) {
  if('id' in where)
    where['id'] = common.unshortenId(where['id']);
  else if('_id' in where)
    where['_id'] = new BSON.ObjectID(where['_id']);

  where = SaltService.encrypt(collection, where);

  var update = {};
  update['$dec'] = {};
  update['$dec'][field] = 1;

  this._update(collection, where, update, cb);
};

DataStore.prototype.remove = function remove(collection, where, cb) {
  if('id' in where)
    where['id'] = common.unshortenId(where['id']);
  else if('_id' in where)
    where['_id'] = new BSON.ObjectID(where['_id']);

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

DataStore.prototype.nextId = function nextId(collection, cb) {
  this.db.collection(collection, function(err, c) {
    if(err) {
      console.log('error opening collection "' + collection + '": ' + err);
      return cb(err);
    }

    c.findAndModify({_id: 'nixus_id'}, [], {'$inc': {seq: 1}}, {new: true, upsert: true}, function(err, result) {
      if(err)
        cb(er);
      else {
        cb(null, result.seq);
      }
    });
  });
};

exports.DataStore = global['DataStore'] || (global['DataStore'] = new DataStore());
