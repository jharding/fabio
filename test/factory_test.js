var _ = require('underscore')
  , assert = require('assert')
  , sinon = require('sinon')
  , fabio = require('../lib/fabio');

describe('Factory', function() {
  var Model;

  describe('#define', function() {
    it('should add statics to constructor function', function() {
      var fn1 = function fn1() {}
        , fn2 = function fn2() {};

      Model = fabio.define({ statics: { fn1: fn1, fn2: fn2 } });

      assert.strictEqual(Model.fn1, fn1);
      assert.strictEqual(Model.fn2, fn2);
    });

    it('should add methods to prototype of constructor function', function() {
      var fn1 = function fn1() {}
        , fn2 = function fn2() {};

      Model = fabio.define({ methods: { fn1: fn1, fn2: fn2 } });

      assert.strictEqual(Model.prototype.fn1, fn1);
      assert.strictEqual(Model.prototype.fn2, fn2);
    });
  });
});
