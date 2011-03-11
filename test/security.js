var SaltService = require('../lib/security').SaltService;
SaltService.init({
  algorithm: "aes192",
  key: {
    string: "secret"
  },
  fields: {
    "c1": ["foo", "bar"]
  }
});

var doc = {
  foo: "the real foo",
  bar: "the real bar"
};
console.log("encrypting: " + JSON.stringify(doc, null, 2));

var doc2 = SaltService.encrypt('c1', doc);

console.log("encrypted: " + JSON.stringify(doc2, null, 2));

var doc3 = SaltService.decrypt('c1', doc2);

console.log("decrypted: " + JSON.stringify(doc3, null, 2));

console.log("c1/foo is salted? " + SaltService.isSalted('c1', 'foo'));
console.log("c2/foo is salted? " + SaltService.isSalted('c2', 'foo'));
