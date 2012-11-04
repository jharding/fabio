// dependencies
// ------------

var _ = require('underscore');

// validators
// ----------

module.exports = {
  isEmpty: _.isEmpty
, isArray: _.isArray
, isObject: _.isObject
, isArguments: _.isArguments
, isFunction: _.isFunction
, isString: _.isString
, isNumber: _.isNumber
, isFinite: _.isFinite
, isBoolean: _.isBoolean
, isDate: _.isDate
, isRegExp: _.isRegExp
, isNaN: _.isNaN
, isNull: _.isNull
, isUndefined: _.isUndefined
, isFuzzyEmail: isFuzzyEmail
, min: min
, max: max
, minmax: minmax
};

// validator definitions
// ---------------------

function isFuzzyEmail(value) {
  return (/[^\s@]+@[^\s@]+\.[^\s@]+/).test(value);
}

function min(_min) {
  if (!_min) { throw new Error('No min specified'); }

  return function(value) {
    if (_.isNumber(value)) { return value >= _min; }

    else if (_.isArray(value) || _.isString(value)) {
      return value.length >= _min;
    }
  };
}

function max(_max) {
  if (!_max) { throw new Error('No max specified'); }

  return function(value) {
    if (_.isNumber(value)) { return value <= _max; }

    else if (_.isArray(value) || _.isString(value)) {
      return value.length <= _max;
    }
  };
}

function minmax(_min, _max) {
  return function(value) {
    return min(_min)(value) && max(_max)(value);
  };
}
