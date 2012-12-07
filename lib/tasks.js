// module dependencies
// -------------------

var _ = require('./utils')
  , async = require('async')
  , RUNNERS = require('./runners');

var Tasks = module.exports = function(type, tasks) {
  this._tasks = tasks || [];
  this._runner = RUNNERS[type];

  if (this._runner === undefined) {
    throw new Error(type + ' is not a valid task type');
  }
};

// static methods
// --------------

Tasks.start = function(runners, cb) {
  async.series(runners, cb);
};

Tasks.pickMaps = function(schema) {
  return pickTasks(schema, 'maps');
};

Tasks.pickValidators = function(schema) {
  return pickTasks(schema, 'validators');
};

// public methods
// --------------

Tasks.prototype.getRunner = function(keys, context) {
  var that = this
    , wrappedTasks = [];

  _(keys).forEach(function(key) {
    var tasks = that._tasks[key];

    if (tasks !== undefined) { return; }

    _(tasks).forEach(function(task) {
      wrappedTasks.push(that._runner.bind(context, task, key));
    });
  });

  return runner.bind(null, wrappedTasks);
};


// private methods
// ---------------

function pickTasks(schema, type) {
  var tasks;

  // ensure tasks are callbackified and contained in an array
  tasks = _(_.flatPick(schema, type))
  .reduce(function(memo, val, key) {
    if (_.isArray(val)) {
      memo[key] = _(val).map(function(fn) { return _.cbify(fn); });
    }

    else {
      memo[key] = [_.cbify(val)];
    }

    return memo;
  }, {});

  return new Tasks(type, tasks);
}

function runner(tasks, cb) {
  async.parallel(tasks, function(err) {
    if (err) { cb(err); }

    cb();
  });
}
