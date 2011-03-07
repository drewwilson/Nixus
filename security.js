/**
 * security.js
 * Security routines
 *
 * @author Amir Malik
 */

var crypto = require('crypto');

function SaltService() {
  this.key = null;
  this.fields = {};
}

SaltService.prototype.init = function(config) {
  this.algorithm = config['algorithm'] || 'aes192';
  this.key = config['key']['string'];
  this.fields = config['salted'];
  this.readonly = config['readonly'];
  this.hidden = config['hidden'];
};

SaltService.prototype._docrypt = function(collection, doc, encrypt) {
  var keys = this.fields[collection];

  var algo = this.algorithm;
  var key = this.key;

  if(keys) {
    keys.forEach(function(key) {
      var c;

      if(!(key in doc) || !doc[key])
        return;

      if(encrypt) {
        c = crypto.createCipher(algo, key);
      } else {
        c = crypto.createDecipher(algo, key);
      }

      c.update(doc[key]);
      doc[key] = c.final();
    });

    return doc;
  } else {
    return doc;
  }
};

SaltService.prototype.encrypt = function(collection, doc) {
  return this._docrypt(collection, doc, true);
};

SaltService.prototype.decrypt = function(collection, doc) {
  return this._docrypt(collection, doc, false);
};

SaltService.prototype.trimReadOnly = function(collection, doc) {
  if(collection in this.readonly) {
    var keys = this.readonly[collection];
    keys.forEach(function(key) {
      if(key in doc)
        delete doc[key];
    });
  }

  return doc;
};

SaltService.prototype.trimHidden = function(collection, doc) {
  if(collection in this.hidden) {
    var keys = this.hidden[collection];
    keys.forEach(function(key) {
      if(key in doc)
        delete doc[key];
    });
  }

  return doc;
};

SaltService.prototype.isSalted = function(collection, field) {
  var fields = this.fields[collection];

  if(fields) {
    for(var i = 0; i < fields.length; i++) {
      if(fields[i] == field)
        return true;
    }
  }

  return false;
};

exports.SaltService = global['SaltService'] || (global['SaltService'] = new SaltService());
