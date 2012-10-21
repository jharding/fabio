module.exports = {
  // https://gist.github.com/2385351
  cbify: function cbify(fn) {
    return function callbackable() {
      var length = arguments.length
        , done = arguments[length - 1];

      if (length > fn.length && _.isFunction(done)) {
        try { done(null, fn.apply(this, arguments)); } catch(e) { done(e); }
      }

      else { fn.apply(this, arguments); }
    };
  }

, flatPick: function flatPick(schema, field) {
    var keys = Object.keys(schema);

    return keys.reduce(function(acc, key) {
      var val = schema[key][field];
      if (val !== undefined) { acc[key] = val; }

      return acc;
    }, {});
  }
};
