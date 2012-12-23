'use strict';

// dependencies
// ------------

var _ = require('./utils')
  , Tasks = require('./tasks')
  , yapawapa = require('yapawapa')
  , async = require('async');

// model factory
// -------------

module.exports = function define(definition) {
  var idKey
    , schema
    , schemaKeys
    , statics
    , methods
    , defaults
    , maps
    , validators
    , Promise
    , Model;

  definition = definition || {};
  schema = definition.schema || {};
  idKey = definition.idKey || 'id';
  methods = definition.methods || {};
  statics = definition.statics || {};

  // add id attr to schema if not present
  if (!schema[idKey]) { schema[idKey] = {}; }

  schemaKeys = Object.keys(schema);
  defaults = _.flatPick(schema, 'default');

  maps = Tasks.pickMaps(schema);
  validators = Tasks.pickValidators(schema);

  // constructor function
  // --------------------

  Model = function(attrs, opts) {
    var promise = new Promise({ context: this });

    attrs = _.chain(attrs || {}).pick(schemaKeys).defaults(defaults).value();
    opts = opts || {};

    this._attrs = null;
    this._oldAttrs = null;
    this._changedAttrKeys = [];

    if (opts.load) {
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

  // statics
  // -------

  statics = _.extend({
    new: function(attrs, opts) {
      return new Model(attrs, opts);
    }

  , create: function(attrs, opts) {
      return new Model(attrs, opts).save();
    }

  , load: function(attrs, opts) {
      return new Model(attrs, _.extend({ load: true }, opts));
    }
  }, statics);

  // methods
  // -------

  methods = _.extend({
    isNew: function() { return !this._attrs[idKey]; }

  , get id() {
      return this._attrs[idKey];
    }

  , set id(val) {
      this._attrs[idKey] = val;
    }

  , get attrs() {
      return _.clone(this._attrs);
    }

  , set: function(attrs, cb) {
      var that = this
        , currentAttrs = this._attrs = this._attrs || {}
        , changedAttrKeys = [];

      // filter out attributes not present in schema
      attrs = _(attrs || {}).pick(schemaKeys);

      // if this model has already been persisted
      // and this is the first change to it
      if (!this.isNew() && !this._oldAttrs) {
        this._oldAttrs = _.clone(this.attrs);
      }

      // keep track of attributes that have changed
      Object.keys(attrs).forEach(function(key) {
        if (currentAttrs[key] !== attrs[key]) {
          changedAttrKeys.push(key);
          currentAttrs[key] = attrs[key];
        }
      });

      this._changedAttrKeys = _.union(this._changedAttrKeys, changedAttrKeys);

      cb(null, this.attrs);
    }

  , save: function(cb) {
      var that = this
        , attrKeys
        , mapsRunner
        , validatorsRunner
        , method = this.isNew() ? 'create' : 'update';

      attrKeys = this.isNew() ? schemaKeys : this._changedAttrKeys;

      // reset
      this._changedAttrKeys = [];

      mapsRunner = maps.getRunner(attrKeys, this);
      validatorsRunner = validators.getRunner(attrKeys, this);

      // run validators and maps
      Tasks.start([validatorsRunner, mapsRunner], function(err) {
        if (err) {
          that._invalid = true;
          that._attrs = that._oldAttrs;
          return cb(err);
        }

        // depending on whether this model is new or not
        // create or update will be called
        that[method].call(that, _(that.attrs).pick(attrKeys), function(err) {
          if (err) {
            that._invalid = true;
            that._attrs = that._oldAttrs;
            return cb(err);
          }

          cb(null, that.attrs);
        });
      });
    }

  , create: function(attrs, cb) {
      console.warn('create method not implemented');
      cb();
    }

  , update: function(attrs, cb) {
      console.warn('update method not implemented');
      cb();
    }
  }, methods);

  _.extend(Model, statics);
  _.extend(Model.prototype, methods);

  Promise = Model.Promise = yapawapa(methods);

  return Model;
};
