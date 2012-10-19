// dependencies
// ------------

var _ = require('underscore')
  , async = require('async');

// model factory
// -------------

module.exports = function define(definition) {
  var schema
    , statics
    , methods
    , keys
    , defaultsByAttr
    , mapsByAttr
    , validatorsByAttr
    , Model;

  definition = definition || {};
  schema = definition.schema;
  statics = definition.statics;
  methods = definition.methods;

  keys = Object.keys(schema);
  defaultsByAttr = flatPick(schema, 'default');

  // ensure maps are callbackified
  mapsByAttr = _(flatPick(schema, 'map'))
  .reduce(function(memo, val, key) {
    memo[key] = cbify(val);
    return memo;
  }, {});

  // ensure validators are callbackified and contained in an array
  validatorsByAttr = _(flatPick(schema, 'validators'))
  .reduce(function(memo, val, key) {
    if (_.isArray(val)) {
      memo[key] = _(val).map(function(fn) { return cbify(fn); });
    }

    else {
      memo[key] = [cbify(val)];
    }

    return memo;
  }, {});

  // constructor function
  // --------------------

  Model = function(attrs) {
    attrs = _.chain(attrs || {}).pick(keys).defaults(defaultsByAttr).value();

    this._attrs;
    this._error;
    this._onError;
    this._onStable;
    this._numOfTasksInProgress = 0;
    this._queue = async.queue(this._queueWorker.bind(this), 1);

    this._queue.drain = this._invokeCallback.bind(this);

    this.set(attrs);
  };

  // public methods
  // --------------

  Model.prototype.set = function(key, val) {
    var attrs = _.clone(key || {})
      , attrKeys;

    if (_.isString(attrs)) { attrs[key] = val; }

    attrs = _(attrs).pick(keys);
    attrKeys = Object.keys(attrs);

    this._attrs = _(this._attrs || {}).extend(attrs);

    _(attrKeys).forEach(function(key) {
      var validators = validatorsByAttr[key];

      if (validators !== undefined) {
        _(validators).forEach(function(validator) {
          this._addTaskToQueue(validatorTask.bind(null, validator, this, key));
        }, this);
      }
    }, this);

    _(attrKeys).forEach(function(key) {
      var map = mapsByAttr[key];

      if (map !== undefined) {
        this._addTaskToQueue(mapTask.bind(null, map, this, key));
      }
    }, this);

    return this;
  };

  Model.prototype.get = function(cb) {
    this._onStable = cb;
    process.nextTick(this._invokeCallbackIfStable.bind(this));

    return this;
  };

  Model.prototype.error = function(cb) {
    this._onError = cb;
    process.nextTick(this._invokeCallbackIfStable.bind(this));

    return this;
  };

  // private methods
  // ---------------

  Model.prototype._addTaskToQueue = function(task) {
    this._numOfTasksInProgress += 1;

    this._queue.push(task, function() {
      this._numOfTasksInProgress -= 1;
    }.bind(this));
  };

  Model.prototype._invokeCallbackIfStable = function() {
    if (this._numOfTasksInProgress === 0) { this._invokeCallback(); }
  };

  Model.prototype._invokeCallback = function() {
    if (!this._error && this._onStable) {
      this._onStable(this, _.clone(this._attrs));

      delete this._onStable;
      delete this._onError;
      delete this._error;
    }

    else if (this._error && this._onError) {
      this._onError(this._error);

      delete this._onStable;
      delete this._onError;
      delete this._error;
    }
  };

  Model.prototype._queueWorker = function(task, done) {
    if (this._error) { done(); return; }

    task(function(err) {
      if (err) { this._error = err; }

      done();
    }.bind(this));
  };

  _(Model).extend(statics);
  _(Model.prototype).extend(methods);

  return Model;
};

// helper functions
// ----------------

function mapTask(map, model, key, done) {
  map(model._attrs[key], function(err, val) {
    if (err) { model._attrs[key] = null; done(err); return; }

    model._attrs[key] = val;
    done();
  });
}

function validatorTask(validator, model, key, done) {
  validator(model._attrs[key], function(err, success) {
    if (err) { done(err); return; }

    if (!success) {
      done(new Error(key + ' failed validation'));
      return;
    }

    done();
  });
}

// https://gist.github.com/2385351
function cbify(fn) {
  return function callbackable() {
    var length = arguments.length
      , done = arguments[length - 1];

    if (length > fn.length && _.isFunction(done)) {
      try {
        done(null, fn.apply(this, arguments));
      } catch(e) { done(e); }
    }

    else { fn.apply(this, arguments); }
  };
}

function flatPick(schema, field) {
  var keys = Object.keys(schema);

  return keys.reduce(function(acc, key) {
    var val = schema[key][field];
    if (val !== undefined) { acc[key] = val; }

    return acc;
  }, {});
}
