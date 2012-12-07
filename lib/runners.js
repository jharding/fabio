// module dependencies
// -------------------

var _ = require('./utils');

module.exports = {
  maps: mapRunner
, validators: validatorRunner
};

// runners
// -------

function mapRunner(map, key, done) {
  map(this._attrs[key], function(err, val) {
    if (err) { this._attrs[key] = null; return done(err); }

    this._attrs[key] = val;
    done();
  });
}

function validatorRunner(validator, key, done) {
  validator(this._attrs[key], function(err, success) {
    if (err) { return done(err); }

    if (!success) {
      return done(new Error(key + ' failed validation'));
    }

    done();
  });
}
