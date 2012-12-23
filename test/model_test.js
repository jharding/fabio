'use strict';

var _ = require('underscore')
  , assert = require('assert')
  , sinon = require('sinon')
  , Tasks = require('../lib/tasks')
  , defineModel = require('../lib/model_factory');

describe('Model', function() {
  var Model;

  beforeEach(function() {
    Model = defineModel({});
  });

  // constructor
  // -----------

  describe('constructor', function() {
    beforeEach(function() {
      Model = defineModel({
        schema: { val: {} , default: { default: 'i am default' } }
      });
    });

    it('should return a promise instance', function() {
      var model = new Model();
      assert(model instanceof Model.Promise);
    });

    it('should accept hash of attrs for initial values', function(done) {
      new Model({ val: 'initial value' })
      .then(function(attrs) {
        assert.equal(attrs.val, 'initial value');
        done();
      });
    });

    it('should use default value if value is not provided', function(done) {
      new Model()
      .then(function(attrs) {
        assert.equal(attrs.default, 'i am default');
        done();
      });
    });

    it('should not use default value if value is provided', function(done) {
      new Model({ default: 'not default' })
      .then(function(attrs) {
        assert.equal(attrs.default, 'not default');
        done();
      });
    });

    it('should call set with passed in attributes', function() {
      var spy = sinon.spy(Model.prototype, 'set')
        , model = new Model({ val: 1, default: 2 });

      assert(spy.calledWith({ val: 1, default: 2 }));
    });

    it('should bypass set if load option is true', function(done) {
      var spy = sinon.spy(Model.prototype, 'set');

      new Model({ val: 1, default: 2 }, { load: true })
      .then(function(attrs) {
        assert(!spy.called);
        assert.deepEqual(attrs, { val: 1, default: 2 });
        done();
      });
    });
  });

  // static methods
  // --------------

  describe('.new', function() {
    // nothing to see here
  });

  describe('.create', function() {
    it('should call create', function(done) {
      var spy = sinon.spy(Model.prototype, 'create')
        , model = Model.create({});

      model.then(function() {
        assert(spy.called);
        done();
      });
    });
  });

  describe('.load', function() {
    it('should not call set', function() {
      var spy = sinon.spy(Model.prototype, 'set')
        , model = Model.load({});

      assert(!spy.called);
    });
  });

  // instance methods
  // ----------------

  describe('#set', function() {
    beforeEach(function() {
      Model = defineModel({
        schema: { one: {} , two: {}, three: {} }
      });
    });

    it('should set model attributes to passed in values', function(done) {
      Model.new()
      .set({ one: 1, two: 2, three: 3 })
      .then(function(attrs) {
        assert.equal(attrs.one, 1);
        assert.equal(attrs.two, 2);
        assert.equal(attrs.three, 3);
        done();
      });
    });

    it('should override existing values', function(done) {
      Model.new({ one: 1, two: 2, three: 3 })
      .set({ one: 2, two: 3 })
      .then(function(attrs) {
        assert.equal(attrs.one, 2);
        assert.equal(attrs.two, 3);
        assert.equal(attrs.three, 3);
        done();
      });
    });

    it('should ignore attributes not present in schema', function(done) {
      Model.new()
      .set({ one: 1, two: 2, four: 4 })
      .then(function(attrs) {
        assert.strictEqual(attrs.four, undefined);
        done();
      });
    });
  });

  describe('#save', function() {
    var ValidatorFailModel
      , ValidatorErrorModel
      , MapErrorModel
      , mapStubCallCount
      , validatorStubCallCount
      , mapStub = function(val) { mapStubCallCount++; return 'mapped'; }
      , validatorStub = function(val) { validatorStubCallCount++; return true; }
      , model;

    beforeEach(function() {
      mapStubCallCount = 0;
      validatorStubCallCount = 0;

      Model = defineModel({
        schema: {
          m1: { maps: mapStub }
        , m2: { maps: mapStub }
        , v1: { validators: validatorStub }
        , v2: { validators: validatorStub  }
        }
      });

      ValidatorFailModel = defineModel({
        schema: {
          sync: {
            validators: function(val) { return false; }
          }
        , async: {
            validators: function(val, cb) {
              process.nextTick(function() { cb(null, false); })
            }
          }
        }
      });

      ValidatorErrorModel = defineModel({
        schema: {
          sync: {
            validators: function(val) { throw new Error('sync error'); }
          }
        , async: {
            validators: function(val, cb) {
              process.nextTick(function() { cb(new Error('async error')); })
            }
          }
        }
      });

      MapErrorModel = defineModel({
        schema: {
          sync: {
            maps: function(val) { throw new Error('sync error'); }
          }
        , async: {
            maps: function(val, cb) {
              process.nextTick(function() { cb(new Error('async error')); })
            }
          }
        }
      });
    });

    it('should treat sync validation failure as error', function(done) {
      ValidatorFailModel.load({ id: 1 })
      .set({ sync: 1 })
      .save()
      .error(function(err) {
        assert(err.message.match(/failed validation/));
        done();
      });
    });

    it('should treat async validation failure as error', function(done) {
      ValidatorFailModel.load({ id: 1 })
      .set({ async: 1 })
      .save()
      .error(function(err) {
        assert(err.message.match(/failed validation/));
        done();
      });
    });

    it('should call error callback on sync validator error', function(done) {
      ValidatorErrorModel.load({ id: 1 })
      .set({ sync: 1 })
      .save()
      .error(function(err) {
        assert.equal(err.message, 'sync error');
        done();
      });
    });

    it('should call error callback on async validator error', function(done) {
      ValidatorErrorModel.load({ id: 1 })
      .set({ async: 1 })
      .save()
      .error(function(err) {
        assert.equal(err.message, 'async error');
        done();
      });
    });

    it('should call error callback on sync map error', function(done) {
      MapErrorModel.load({ id: 1 })
      .set({ sync: 1 })
      .save()
      .error(function(err) {
        assert.equal(err.message, 'sync error');
        done();
      });
    });

    it('should call error callback on async map error', function(done) {
      MapErrorModel.load({ id: 1 })
      .set({ async: 1 })
      .save()
      .error(function(err) {
        assert.equal(err.message, 'async error');
        done();
      });
    });

    it('should call fullfillment callback with attributes', function(done) {
      Model.create()
      .then(function(attrs) {
        assert.deepEqual(attrs, { m1: 'mapped', m2: 'mapped' });
        done();
      });
    });

    describe('when model is new', function() {
      beforeEach(function() {
        model = Model.new({ m1: 1, m2: 2, v1: 1, v2: 2 })
      });

      it('should run tasks for all attributes', function(done) {
        model.save()
        .then(function(attrs) {
          assert.equal(mapStubCallCount, 2);
          assert.equal(validatorStubCallCount, 2);
          done();
        });
      });

      it('should call create with all attributes', function(done) {
        var spy = sinon.spy(Model.prototype, 'create')

        model.save()
        .then(function(attrs) {
          assert(spy.calledWith({ m1: 'mapped', m2: 'mapped', v1: 1, v2: 2 }));
          done();
        });
      });
    });

    describe('when model is not new', function() {
      beforeEach(function() {
        model = Model.load({ id: 1, m1: 0, m2: 0, v1: 0, v2: 0 });
      });

      it('should run tasks for changed attributes', function(done) {
        model.set({ m1: 1, v1: 1 })
        .save()
        .then(function(attrs) {
          assert.equal(mapStubCallCount, 1);
          assert.equal(validatorStubCallCount, 1);
          done();
        });
      });

      it('should call update with changed attributes', function(done) {
        var spy = sinon.spy(Model.prototype, 'update')

        model.set({ m1: 1, v1: 1 })
        .save()
        .then(function(attrs) {
          assert(spy.calledWith({ m1: 'mapped', v1: 1 }));
          done();
        });
      });
    });
  });
});
