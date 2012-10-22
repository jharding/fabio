// dependencies
// ------------

var _ = require('underscore')
  , utils = require('./utils')
  , rsvp = require('fabio-rsvp')
  , async = require('async');

// model factory
// -------------

module.exports = function define(definition) {
  var schema
    , idAttr
    , udfs
    , statics
    , methods
    , keys
    , defaultsByAttr
    , mapsByAttr
    , validatorsByAttr
    , Promise
    , Model;

  definition = definition || {};
  schema = definition.schema || {};
  idAttr = definition.idAttr || 'id';
  udfs = definition.methods || {};
  statics = definition.statics || {};

  // add id attr to schema if not present
  if (!schema[idAttr]) { schema[idAttr] = {}; }

  keys = Object.keys(schema);
  defaultsByAttr = utils.flatPick(schema, 'default');

  // ensure maps are callbackified
  mapsByAttr = _(utils.flatPick(schema, 'map'))
  .reduce(function(memo, val, key) {
    memo[key] = utils.cbify(val);
    return memo;
  }, {});

  // ensure validators are callbackified and contained in an array
  validatorsByAttr = _(utils.flatPick(schema, 'validators'))
  .reduce(function(memo, val, key) {
    if (_.isArray(val)) {
      memo[key] = _(val).map(function(fn) { return utils.cbify(fn); });
    }

    else {
      memo[key] = [utils.cbify(val)];
    }

    return memo;
  }, {});

  // constructor function
  // --------------------

  Model = function(attrs) {
    var promise = new Promise(this);

    attrs = _.chain(attrs || {}).pick(keys).defaults(defaultsByAttr).value();

    this._attrs = null;
    this._newAttrs = null;

    this.set(attrs, function(err, result) {
      if (err) { promise.reject(err); return; }

      promise.resolve(result);
    });

    return promise;
  };

  // public methods
  // --------------

  methods = {
    isNew: function() { return !this._attrs[idAttr]; }
  , getAttrs: function() { return _.clone(this._attrs); }

  , set: function(attrs, cb) {
      var attrKeys
        , validatorTasks = []
        , mapTasks = []
        , runValidatorTasks
        , runMapTasks;

      attrs = _(attrs || {}).pick(keys);
      attrKeys = Object.keys(attrs);

      this._newAttrs = _(this._attrs || {}).extend(attrs);

      _(attrKeys).forEach(function(key) {
        var validators = validatorsByAttr[key];

        if (validators !== undefined) {
          _(validators).forEach(function(validator) {
            validatorTasks.push(validatorTask.bind(null, validator, this, key));
          }.bind(this));
        }
      }.bind(this));

      _(attrKeys).forEach(function(key) {
        var map = mapsByAttr[key];

        if (map !== undefined) {
          mapTasks.push(mapTask.bind(null, map, this, key));
        }
      }, this);

      runValidatorTasks = runTasks.bind(this, validatorTasks);
      runMapTasks = runTasks.bind(this, mapTasks);

      async.series([runValidatorTasks, runMapTasks], function(err) {
        if (err) { cb(err); return; }

        this._attrs = this._newAttrs;
        delete this._newAttrs;

        cb(null, this.getAttrs());
      }.bind(this));
    }

  , save: function(cb) {
      if (this.isNew()) {
        this.create(this.getAttrs(), cb);
      }

      else {
        this.update(this.getAttrs(), cb);
      }
    }
  };

  _.extend(Model.prototype, methods, udfs);

  Promise = Model.Promise = rsvp.define(_.extend(methods, udfs));

  return Model;
};

// helper functions
// ----------------

function runTasks(tasks, cb) {
  async.parallel(tasks, function(err) {
    if (err) { cb(err); }

    cb(null);
  });
}

function mapTask(map, model, key, done) {
  map(model._newAttrs[key], function(err, val) {
    if (err) { model._newAttrs[key] = null; done(err); return; }

    model._newAttrs[key] = val;
    done();
  });
}

function validatorTask(validator, model, key, done) {
  validator(model._newAttrs[key], function(err, success) {
    if (err) { done(err); return; }

    if (!success) {
      done(new Error(key + ' failed validation'));
      return;
    }

    done();
  });
}
