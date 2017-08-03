const hookHelpers = require('../helpers/hooks');

// @TODO: later hooks might be both sync and async
module.exports = function composeWithHooks(value, hooks) {
  return hookHelpers.call(hooks, value);
};
