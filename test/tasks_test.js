'use strict';

var _ = require('underscore')
  , assert = require('assert')
  , sinon = require('sinon')
  , Tasks = require('../lib/tasks');

describe('Tasks', function() {
  var schema;

  beforeEach(function() {
    schema = {
      attr1: {
        maps: function(val) { return 'mapped'; }
      , validators: function(val) { return true; }
      }
    , attr2: {
        maps: [function(val) { return 'mapped'; }]
      , validators: [function(val) { return true; }]
      }
    , attr3: {
        maps: [
          function(val) { return 'mapped'; }
        , function(val) { return 'mapped again'; }
        ]
      , validators: [
          function(val) { return true; }
        , function(val) { return true; }
        ]
      }
    };
  });

  describe('constructor', function() {
    it('should throw error if passed invalid task type', function(){
      assert.throws(function() { new Tasks('not a valid task type') });
    });
  });

  describe('.start', function() {
    it('should call passed in runners', function(done) {
      var spyRunner1 = sinon.spy(function(cb) { cb(); })
        , spyRunner2 = sinon.spy(function(cb) { cb(); })
        , spyRunner3 = sinon.spy(function(cb) { cb(); });

      Tasks.start([spyRunner1, spyRunner2, spyRunner3], function(err) {
        assert(!err);
        assert(spyRunner1.called);
        assert(spyRunner2.called);
        assert(spyRunner3.called);
        done();
      });
    });
  });

  describe('.pickMaps', function() {
    it ('should return Tasks instance', function() {
      assert(Tasks.pickMaps(schema) instanceof Tasks);
    });

    it('should group map tasks by attr key', function() {
      var maps = Tasks.pickMaps(schema);

      assert.equal(maps._tasks.attr1.length, 1);
      assert.equal(maps._tasks.attr2.length, 1);
      assert.equal(maps._tasks.attr3.length, 2);
    });
  });

  describe('.pickValidators', function() {
    it ('should return Tasks instance', function() {
      assert(Tasks.pickValidators(schema) instanceof Tasks);
    });

    it('should group map tasks by attr key', function() {
      var maps = Tasks.pickValidators(schema);

      assert.equal(maps._tasks.attr1.length, 1);
      assert.equal(maps._tasks.attr2.length, 1);
      assert.equal(maps._tasks.attr3.length, 2);
    });
  });

  describe('#getRunner', function() {
    it('should return function', function() {
      var maps = Tasks.pickValidators(schema)
        , runner = maps.getRunner(Object.keys(schema), {});

      assert.equal(typeof runner, 'function');
    });
  });
});
