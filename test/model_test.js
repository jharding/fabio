var _ = require('underscore')
  , assert = require('assert')
  , sinon = require('sinon')
  , fabio = require('../lib/fabio');

describe('Model', function() {
  var Model;

  beforeEach(function() {
    Model = fabio.define({});
  });

  describe('constructor', function() {
    beforeEach(function() {
      Model = fabio.define({
        schema: { val: {} , default: { default: 'i am default' } }
      });
    });

    it('should return a promise instance', function() {
      var model = new Model();
      assert(model instanceof Model.Promise);
    });

    it('should accept hash of attrs for initial values', function(done) {
      new Model({ val: 'initial value' })
      .value(function(attrs) {
        assert.equal(attrs.val, 'initial value');
        done();
      });
    });

    it('should use default value if value is not provided', function(done) {
      new Model()
      .value(function(attrs) {
        assert.equal(attrs.default, 'i am default');
        done();
      });
    });

    it('should not use default value if value is provided', function(done) {
      new Model({ default: 'not default' })
      .value(function(attrs) {
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
      .value(function(attrs) {
        assert(!spy.called);
        assert.deepEqual(attrs, { val: 1, default: 2 });
        done();
      });
    });
  });

  describe('.new', function() {
    // nothing to see here
  });

  describe('.create', function() {
    it('should call create', function(done) {
      var spy = sinon.spy(Model.prototype, 'create')
        , model = Model.create({});

      model.value(function() {
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

  xdescribe('#set', function() {
    var callOrder
      , syncMapStub
      , asyncMapStub
      , syncValidatorStub
      , asyncValidatorStub
      , syncMapStubCalledCount
      , asyncMapStubCalledCount
      , syncValidatorStubCalledCount
      , asyncValidatorStubCalledCount;

    beforeEach(function() {
      callOrder = [];

      syncMapStubCalledCount =
      asyncMapStubCalledCount =
      syncValidatorStubCalledCount =
      asyncValidatorStubCalledCount = 0;

      syncMapStub = function(val) {
        callOrder.push('syncMap');
        syncMapStubCalledCount += 1;

        return 'sync' + val;
      };

      asyncMapStub = function(val, cb) {
        process.nextTick(function() {
          callOrder.push('asyncMap');
          asyncMapStubCalledCount += 1;

          cb(null, 'async' + val);
        });
      };

      syncValidatorStub = function(val) {
        callOrder.push('syncValidator');
        syncValidatorStubCalledCount += 1;

        return true;
      };

      asyncValidatorStub = function(val, cb) {
        process.nextTick(function() {
          callOrder.push('asyncValidator');
          asyncValidatorStubCalledCount += 1;

          cb(null, true);
        });
      };

      Model = fabio.define({
        schema: {
          syncMap: { map: syncMapStub }
        , asyncMap: { map: asyncMapStub }
        , syncValidator: { validators: syncValidatorStub }
        , asyncValidator: { validators: asyncValidatorStub }
        , validators: { validators: [syncValidatorStub, syncValidatorStub] }
        , failSyncValidator: { validators: function(val) { return false; } }
        , failAsyncValidator: {
            validators: function(val, cb) {
              process.nextTick(function() { cb(null, false); });
            }
          }
        , errorSyncMap: {
            map: function(val) { throw new Error('errorSyncMap'); }
          }
        , errorAsyncMap: {
            map: function(val, cb) {
              process.nextTick(function() { cb(new Error('errorAsyncMap')); });
            }
          }
        , errorSyncValidator: {
            validators: function(val) { throw new Error('errorSyncValidator'); }
          }
        , errorAsyncValidator: {
            map: function(val, cb) {
              process.nextTick(function() {
                cb(new Error('errorAsyncValidator'));
              });
            }
          }
        , order: {
            map: asyncMapStub
          , validators: [syncValidatorStub, asyncValidatorStub, syncValidatorStub]
          }
        }
      });
    });

    it('should be chainable', function() {
      var model = Model.new()
        , _model = model.set();

      assert(_model instanceof Model.Promise);
      assert.deepEqual(model._model, _model._model);
    });

    xit('should call map functions', function(done) {
      Model.new()
      .set({ syncMap: 1, asyncMap: 2 })
      .value(function(attrs) {
        assert.equal(syncMapStubCalledCount, 1);
        assert.equal(asyncMapStubCalledCount, 1);
        done();
      });
    });

    xit('should call validator functions', function(done) {
      Model.new()
      .set({ syncValidator: 1, asyncValidator: 2, validators: 3 })
      .value(function(attrs) {
        assert.equal(syncValidatorStubCalledCount, 3);
        assert.equal(asyncValidatorStubCalledCount, 1);
        done();
      });
    });

    xit('should process validators before maps', function(done) {
      Model.new()
      .set({ order: 'order' })
      .value(function(attrs) {
        assert.equal(callOrder.indexOf('asyncMap'), 3);
        done();
      });
    });

    xit('should invoke error callback if sync validator fails', function(done) {
      Model.new()
      .set({ errorSyncValidator: 1 })
      .error(function(err) {
        assert.equal(err.message, 'errorSyncValidator');
        done();
      });
    });

    xit('should invoke error callback if async validator fails', function(done) {
      Model.new()
      .set({ errorAsyncValidator: 1 })
      .error(function(err) {
        assert.equal(err.message, 'errorAsyncValidator');
        done();
      });
    });

    xit('should treat sync validation failture as error', function(done) {
      Model.new()
      .set({ failSyncValidator: 1 })
      .error(function(err) {
        assert(/failSyncValidator/.test(err.message));
        done();
      });
    });

    xit('should treat async validation failture as error', function(done) {
      Model.new()
      .set({ failAsyncValidator: 1 })
      .error(function(err) {
        assert(/failAsyncValidator/.test(err.message));
        done();
      });
    });

    xit('should map attr values according to map functions', function(done) {
      Model.new()
      .set({ syncMap: 'sync', asyncMap: 'async' })
      .value(function(attrs) {
        assert.equal(attrs.syncMap, 'syncsync');
        assert.equal(attrs.asyncMap, 'asyncasync');
        done();
      });
    });

    xit('should invoke error callback if sync map fails', function(done) {
      Model.new()
      .set({ errorSyncMap: 'sync' })
      .error(function(err) {
        assert.equal(err.message, 'errorSyncMap');
        done();
      });
    });

    xit('should invoke error callback if async map fails', function(done) {
      Model.new()
      .set({ errorAsyncMap: 'async' })
      .error(function(err) {
        assert.equal(err.message, 'errorAsyncMap');
        done();
      });
    });
  });

  xdescribe('#save', function() {
    var createStub
      , updateStub;

    beforeEach(function() {
      createStub = function(attrs, cb) {
        process.nextTick(function() {
          createStub.called = true;
          cb(null);
        });
      };

      updateStub = function(attrs, cb) {
        process.nextTick(function() {
          updateStub.called = true;
          cb(null);
        });
      };

      Model = fabio.define({
        schema: {
          val: {}
        }
      , methods: {
          create: createStub
        , update: updateStub
        }
      });
    });

    it('should call fulfillment callback with attributes', function(done) {
      Model.new({ val: 'initial value' })
      .save()
      .value(function(attrs) {
        assert.deepEqual(attrs, { val: 'initial value' });
        done();
      });
    });

    it('should call create if model is new', function(done) {
      Model.new({ val: 'initial value' })
      .save()
      .value(function(attrs) {
        assert(createStub.called);
        assert(!updateStub.called);
        done();
      });
    });

    it('should call update if model is not new', function(done) {
      Model.new({ id: 1, val: 'initial value' })
      .save()
      .value(function(attrs) {
        assert(updateStub.called);
        assert(!createStub.called);
        done();
      });
    });
  });
});
