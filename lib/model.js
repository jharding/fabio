// dependencies
// ------------

var _ = require('underscore');
var async = require('async');
var EventEmitter = require('events').EventEmitter;

// constructor function
// --------------------

var Model = module.exports = function Model(attributes) {
  if (!(this instanceof Model)) {
    throw new Error('Constructor function not called with new operator.');
  }

  this._attributes = {};
  _(this.schema).forEach(function(value, key) {
    this._attributes[key] = value.default;
  }.bind(this));

  this.set(_.clone(attributes || {}));

  this.initialize.apply(this, arguments);
};

// inherit from EventEmitter
Model.prototype.__proto__ = EventEmitter.prototype;

// class methods
// -------------

Model.extend = extend;

// instance members
// ----------------

Model.prototype.schema = {};

// instance methods
// ----------------

Model.prototype.initialize = function() {};

Model.prototype.set = function(key, value) {
  if (!key) { return this; }

  var attributes = {};

  // support (key, value) and (object) signature
  _.isObject(key) ? attributes = key : attributes[key] = value;

  // run new values through their associated validators
  var validator;
  _(attributes).forEach(function(value, key) {
    validator = this.schema[key].validator;
    if (validator && !validator(value)) {
      throw new Error('Validation failed for ' + key);
    }
  }.bind(this));

  // run new values through their associated transform function
  var transform;
  _(attributes).forEach(function(value, key) {
    transform = this.schema[key].transform;
    if (transform) { attributes[key] = transform(value); }
  }.bind(this));

  // after validation and tranformations, update attributes
  _(attributes).forEach(function(value, key) {
    this._attributes[key] = value;
  }.bind(this));

  return this;
};

Model.prototype.get = function(key) {
  return this._attributes[key];
};

// helper functions
// ----------------

function getValue(obj, key) {
  if (!obj || !obj[key]) { return null; }

  return _.isFunction(obj[key]) ? obj[key]() : obj[key];
}

function extend(protoProps, classProps) {
  var child = inherits(this, protoProps, classProps);
  child.extend = this.extend;
  return child;
}

function inherits(parent, protoProps, staticProps) {
  var EmptyConstructor = function() {};
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ parent.apply(this, arguments); };
  }

  // Inherit class (static) properties from parent.
  _.extend(child, parent);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  EmptyConstructor.prototype = parent.prototype;
  child.prototype = new EmptyConstructor();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) { _.extend(child.prototype, protoProps); }

  // Add static properties to the constructor function, if supplied.
  if (staticProps) { _.extend(child, staticProps); }

  // Correctly set child's `prototype.constructor`.
  child.prototype.constructor = child;

  // Set a convenience property in case the parent's prototype is needed later.
  child.__super__ = parent.prototype;

  return child;
}
