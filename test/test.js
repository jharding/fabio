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

      Object.keys(defaults).forEach(function(key) {
        assert.strictEqual(model._attributes[key], defaults[key]);
      });
    });
  });

  describe('#set', function() {
    var Model, model;

    beforeEach(function() {
      Model = fabio.Model.extend();
      model = new Model();
    });

    it('should accept (key, value) signature', function() {
      model.set('prop', 1);

      assert.strictEqual(model._attributes.prop, 1);
    });

    it('should accept (object) signature', function() {
      var attributes = { prop1: 1, prop2: 2 };
      model.set(attributes);

      Object.keys(attributes).forEach(function(key) {
        assert.strictEqual(model._attributes[key], attributes[key]);
      });
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
