// module dependencies
// -------------------

var _ = require('./utils');

module.exports = {
  maps: mapRunner
, validators: validatorRunner
};

// runners
// -------

function mapRunner(map, key, cb) {
  map(this._attrs[key], function(err, val) {
    if (err) { this._attrs[key] = null; return cb(err); }

    this._attrs[key] = val;
    cb();
  });
}

function validatorRunner(validator, key, cb) {
  validator(this._attrs[key], function(err, success) {
    if (err) { return cb(err); }

    if (!success) {
      return cb(new Error(key + ' failed validation'));
    }

    cb();
  });
}
