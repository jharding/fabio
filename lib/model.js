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

  Model = function(attrs, opts) {
    var promise = new Promise(this);

    attrs = _.chain(attrs || {}).pick(keys).defaults(defaultsByAttr).value();
    opts = opts || {};

    this._attrs = null;
    this._newAttrs = null;

    if (opts.raw) {
      promise.resolve(this._attrs = attrs);
    }

    else {
      this.set(attrs, function(err, result) {
        if (err) { return promise.reject(err); }

        promise.resolve(result);
      });
    }

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
        , model = this
        , runValidatorTasks
        , runMapTasks;

      attrs = _(attrs || {}).pick(keys);
      attrKeys = Object.keys(attrs);

      this._newAttrs = _(this._attrs || {}).extend(attrs);

      // prepare validator tasks
      _(attrKeys).forEach(function(key) {
        var validators = validatorsByAttr[key];

        if (validators !== undefined) {
          _(validators).forEach(function(validator) {
            validatorTasks
            .push(validatorTask.bind(null, validator, model, key));
          });
        }
      });

      // prepare map tasks
      _(attrKeys).forEach(function(key) {
        var map = mapsByAttr[key];

        if (map !== undefined) {
          mapTasks.push(mapTask.bind(null, map, model, key));
        }
      });

      runValidatorTasks = runTasks.bind(this, validatorTasks);
      runMapTasks = runTasks.bind(this, mapTasks);

      // run validator and map tasks
      async.series([runValidatorTasks, runMapTasks], function(err) {
        if (err) { return cb(err); }

        model._attrs = model._newAttrs;
        delete model._newAttrs;

        cb(null, model.getAttrs());
      });
    }

  , save: function(cb) {
      if (this.isNew()) {
        this.create(this.getAttrs(), saveHandler.bind(this));
      }

      else {
        this.update(this.getAttrs(), saveHandler.bind(this));
      }

      function saveHandler(err) {
        if (err) { return cb(err); }

        cb(null, this.getAttrs());
      }
    }
  };

  _.extend(Model, statics);
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
    if (err) { model._newAttrs[key] = null; return done(err); }

    model._newAttrs[key] = val;
    done();
  });
}

function validatorTask(validator, model, key, done) {
  validator(model._newAttrs[key], function(err, success) {
    if (err) { return done(err); }

    if (!success) {
      return done(new Error(key + ' failed validation'));
    }

    done();
  });
}
