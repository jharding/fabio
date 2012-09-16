// Fabio
// =====
// * GitHub: https://github.com/jharding/fabio
// * Copyright (c) 2012 Jake Harding
// * Licensed under the MIT license.

// dependencies
// ------------

var _ = require('underscore');
var async = require('async');

// constructor function
// --------------------

var Model = exports.Model = function Model(attributes) {
  if (!(this instanceof Model)) {
    throw new Error('Constructor function not called with new operator.');
  }

  attributes = attributes || {};

  var defaults;
  if (defaults = getValue(this, 'defaults')) {
    attributes = _.extend({}, defaults, attributes);
  }

  this._attributes = attributes;

  this.initialize.apply(this, arguments);
};

// class methods
// -------------

Model.extend = extend;

// instance methods
// ----------------

Model.prototype.initialize = function() {};

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
