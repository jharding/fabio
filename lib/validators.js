// dependencies
// ------------

var _ = require('underscore');

// validators
// ----------

module.exports = {
  isEmpty: _.isEmpty,
  isArray: _.isArray,
  isObject: _.isObject,
  isArguments: _.isArguments,
  isFunction: _.isFunction,
  isString: _.isString,
  isNumber: _.isNumber,
  isFinite: _.isFinite,
  isBoolean: _.isBoolean,
  isDate: _.isDate,
  isRegExp: _.isRegExp,
  isNaN: _.isNaN,
  isNull: _.isNull,
  isUndefined: _.isUndefined
};
