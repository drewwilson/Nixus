/**
 * rest.js
 * REST endpoints
 *
 * @author Amir Malik
 */

var connect = require('../vendor/connect');

function REST() {
}

exports.REST = global['REST'] || (global['REST'] = new REST());
