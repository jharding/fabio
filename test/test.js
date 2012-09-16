var _ = require('underscore');
var assert = require('assert');
var sinon = require('sinon');
var fabio = require('../lib/fabio');

describe('Model Extension', function() {
  describe('#constructor', function() {
    it('should call initalize method', function() {
      var spy = sinon.spy();
      var Model = fabio.Model.extend({ initialize: spy });
      var model = new Model();

      assert(spy.called);
    });

    it('should use defaults', function() {
      var defaults = {
        prop1: 1,
        prop2: 'hi there.'
      };
      var Model = fabio.Model.extend({ defaults: defaults });
      var model = new Model();

      _(defaults).forEach(function(value, key) {
        assert.strictEqual(model._attributes[key], defaults[key]);
      });
    });
  });

  describe('#set', function() {
    var Model, model;

    beforeEach(function() {
      Model = fabio.Model.extend({
        validaters: {
          validatedProp: function(validatedProp) {
            return validatedProp > 0;
          }
        }
      });
      model = new Model();
    });

    it('should accept (key, value) signature', function() {
      model.set('prop', 1);
      assert.strictEqual(model._attributes.prop, 1);
    });

    it('should accept (object) signature', function() {
      var attributes = { prop1: 1, prop2: 2 };
      model.set(attributes);

      _(attributes).forEach(function(value, key) {
        assert.strictEqual(model._attributes[key], attributes[key]);
      });
    });

    it('should throw an error if an attribute fails its validater', function() {
      assert.throws(function() {
        model.set('validatedProp', -1);
      });
    });

    it('should abort if an attribute fails its validater', function() {
      var _attributes = _.clone(model._attributes);
      assert.throws(function() {
        model.set({ prop1: 1, prop2: 2, validatedProp: -1 });
      });

      assert.deepEqual(model._attributes, _attributes);
    });

    it('should act normal if an attribute passes its validater', function() {
      model.set('validatedProp', 1);
      assert.strictEqual(model._attributes.validatedProp, 1);
    });

    it('should be chainable', function() {
      assert.deepEqual(model, model.set());
    });
  });

  describe('#get', function() {
    var Model, model;

    beforeEach(function() {
      Model = fabio.Model.extend();
      model = new Model();
    });

    it ('should return the correct value', function() {
      model.set('prop', 1);
      assert.strictEqual(model.get('prop'), 1);
    });

    it('should return undefined if attribute has not been set', function() {
      assert.strictEqual(model.get('undefined'), undefined);
    });
  });
});
