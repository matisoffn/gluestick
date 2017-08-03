/* @flow */

/**
 * @TODO: docs
 */
export async function runOnEnter(
  store: Object,
  branch: Object,
  request: ?Object,
) {
  await Promise.all(
    branch
      .map(({ route, match }) => {
        return {
          onEnter: route.component.onEnter || match.params.onEnter,
          match,
        };
      })
      .filter(({ onEnter }) => onEnter)
      .map(({ onEnter, match }) => onEnter(store, match, request)),
  );
}
