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

exports.DataStore = global['DataStore'] || (global['DataStore'] = new DataStore());
