/* @flow */

/**
 * @TODO: docs
 */
async function runOnEnter(branch: Object, request: ?Object) {
  console.log(branch);

  await Promise.all(
    branch
      .map(({ route, match }) => {
        return {
          onEnter: route.component
            ? route.component.onEnter
            : match.params.onEnter,
          match,
        };
      })
      .filter(({ onEnter }) => onEnter)
      .map(({ onEnter, match }) => onEnter(match, request)),
  );
}

module.exports = {
  runOnEnter,
};
