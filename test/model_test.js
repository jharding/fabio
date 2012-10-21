var _ = require('underscore')
  , assert = require('assert')
  , sinon = require('sinon')
  , fabio = require('../lib/fabio');

describe('Model', function() {
  var Model;

  describe('#constructor', function() {
    var mapStub
      , validatorStub
      , mapStubCalledCount
      , validatorStubCalledCount;

    beforeEach(function() {
      mapStubCalledCount = 0;
      validatorStubCalledCount = 0;
      mapStub = function(val) {
        mapStubCalledCount += 1; return 'val';
      };
      validatorStub = function(val) {
        validatorStubCalledCount += 1; return true;
      };

      Model = fabio.define({
        schema: {
          val: {}
        , default: { default: 'i am default' }
        , map1: { map: mapStub }
        , map2: { map: mapStub }
        , validator1: { validators: validatorStub }
        , validator2: { validators: [validatorStub, validatorStub] }
        }
      });
    });

    it('should return a promise instance', function() {
      var model = new Model();
      assert(model instanceof Model.Promise);
    });

    it('should accept hash of attrs for inital values', function(done) {
      new Model({ val: 'initial value' })
      .getAttrs().then(function(attrs) {
        assert.equal(attrs.val, 'initial value');
        done();
      });
    });

    it('should use default value if value is not provided', function(done) {
      new Model()
      .getAttrs().then(function(attrs) {
        assert.equal(attrs.default, 'i am default');
        done();
      });
    });

    it('should not use default value if value is provided', function(done) {
      new Model({ default: 'not default' })
      .getAttrs().then(function(attrs) {
        assert.equal(attrs.default, 'not default');
        done();
      });
    });

    it('should call set with passed in attributes', function(done) {
      var spy = sinon.spy(Model.prototype, 'set')
        , model = new Model({ val: 1, default: 2 });

      assert(spy.calledWith({ val: 1, default: 2 }));
      done();
    });
  });

  describe('#set', function() {
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
      var model = new Model()
        , _model = model.set();

      assert(_model instanceof Model.Promise);
      assert.deepEqual(model._model, _model._model);
    });

    it('should call map functions', function(done) {
      var model = new Model();

      model.set({ syncMap: 1, asyncMap: 2 })
      .getAttrs().then(function(attrs) {
        assert.equal(syncMapStubCalledCount, 1);
        assert.equal(asyncMapStubCalledCount, 1);
        done();
      });
    });

    it('should call validator functions', function(done) {
      var model = new Model();

      model.set({ syncValidator: 1, asyncValidator: 2, validators: 3 })
      .getAttrs().then(function(attrs) {
        assert.equal(syncValidatorStubCalledCount, 3);
        assert.equal(asyncValidatorStubCalledCount, 1);
        done();
      });
    });

    it('should process validators before maps', function(done) {
      var model = new Model();

      model.set({ order: 'order' })
      .getAttrs().then(function(attrs) {
        assert.equal(callOrder.indexOf('asyncMap'), 3);
        done();
      });
    });

    it('should invoke error callback if sync validator fails', function(done) {
      var model = new Model();

      model.set({ errorSyncValidator: 1 })
      .error(function(err) {
        assert.equal(err.message, 'errorSyncValidator');
        done();
      });
    });

    it('should invoke error callback if async validator fails', function(done) {
      var model = new Model();

      model.set({ errorAsyncValidator: 1 })
      .error(function(err) {
        assert.equal(err.message, 'errorAsyncValidator');
        done();
      });
    });

    it('should treat sync validation failture as error', function(done) {
      var model = new Model();

      model.set({ failSyncValidator: 1 })
      .error(function(err) {
        assert(/failSyncValidator/.test(err.message));
        done();
      });
    });

    it('should treat async validation failture as error', function(done) {
      var model = new Model();

      model.set({ failAsyncValidator: 1 })
      .error(function(err) {
        assert(/failAsyncValidator/.test(err.message));
        done();
      });
    });

    it('should map attr values according to map functions', function(done) {
      var model = new Model();

      model.set({ syncMap: 'sync', asyncMap: 'async' })
      .getAttrs().then(function(attrs) {
        assert.equal(attrs.syncMap, 'syncsync');
        assert.equal(attrs.asyncMap, 'asyncasync');
        done();
      });
    });

    it('should invoke error callback if sync map fails', function(done) {
      var model = new Model();

      model.set({ errorSyncMap: 'sync' })
      .error(function(err) {
        assert.equal(err.message, 'errorSyncMap');
        done();
      });
    });

    it('should invoke error callback if async map fails', function(done) {
      var model = new Model();

      model.set({ errorAsyncMap: 'async' })
      .error(function(err) {
        assert.equal(err.message, 'errorAsyncMap');
        done();
      });
    });
  });
});
