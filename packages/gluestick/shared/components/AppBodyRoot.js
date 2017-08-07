/* @flow */

import React, { Component, PropTypes } from 'react';
import { StaticRouter, Router as OriginalRouter } from 'react-router';
import { renderRoutes, matchRoutes } from 'react-router-config';
import { Provider } from 'react-redux';
import createBrowserHistory from 'history/createBrowserHistory';
import { createLocation } from 'history/LocationUtils';
// import { useScroll } from 'react-router-scroll';

type Props = {
  // httpClient: PropTypes.object.isRequired
  routes: any[],
  store: Object,
};

type State = {
  mounted: boolean,
};

export default class AppBodyRoot extends Component<void, Props, State> {
  static propTypes = {
    // httpClient: PropTypes.object.isRequired,
    routes: PropTypes.array.isRequired,
    store: PropTypes.object.isRequired,
  };

  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      mounted: false,
    };

    this.Router = StaticRouter;
    this.routerProps = {};
    if (typeof window !== 'undefined') {
      this.Router = OriginalRouter;
      this.routerProps.history = createHistoryWithAsyncHooks();
    }
  }

  componentWillMount() {
    this.setState({ mounted: true });
    const { routes, store } = this.props;
    if (typeof window !== 'undefined' && this.routerProps.history) {
      this.routerProps.history.onTransition(async location => {
        const branch = matchRoutes(routes, location.pathname);
        if (!branch.length) {
          throw new Error('todo');
        }

        const { route, match } = branch[branch.length - 1];

        const onEnter = route.component
          ? route.component.onEnter
          : match.params.onEnter;

        await onEnter(store, match, location);
      });
    }
  }

  componentWillUnmount() {
    this.setState({ mounted: false });
    if (this.routerProps.history) {
      this.routerProps.history.removeAllListeners();
    }
  }

  render() {
    const { Router, routerProps, props: { routes, store, serverProps } } = this;

    if (serverProps) {
      routerProps.location = serverProps.location;
      routerProps.context = serverProps.context;
    }

    // @TODO: scrolling
    return (
      <Provider store={store}>
        <Router {...routerProps}>
          {renderRoutes(wrapRouteComponents(routes))}
        </Router>
      </Provider>
    );
  }

  // _renderRouter(props: Props): Object | Component<*, *, *> {
  // server rendering
  // if (props.routerContext) return props.routerContext;

  // router middleware
  // const render: Function = applyRouterMiddleware(
  //   useScroll((prevRouterProps, { location, routes }) => {
  //     // Initial render - skip scrolling
  //     if (!prevRouterProps) {
  //       return false;
  //     }

  //     // If the user provides custom scroll behaviour, use it, otherwise fallback to the default
  //     // behaviour.
  //     const { useScroll: customScrollBehavior } =
  //       routes.find(route => route.useScroll) || {};

  //     if (typeof customScrollBehavior === 'function') {
  //       return customScrollBehavior(prevRouterProps, location);
  //     } else if (customScrollBehavior) {
  //       throw new Error('useScroll prop must be a function');
  //     }

  //     // Do not scroll on route change if a `ignoreScrollBehavior` prop is set to true on
  //     // route components in the app. e.g.
  //     // <Route ignoreScrollBehavior={true} path="mypage" component={MyComponent} />
  //     if (routes.some(route => route.ignoreScrollBehavior)) {
  //       return false;
  //     }
  //     return true;
  //   }),
  // );
  // }
}

export function createHistoryWithAsyncHooks() {
  const createKey = () => Math.random().toString(36).substr(2, 6);

  const history = createBrowserHistory();
  const push = history.push.bind(history);
  const replace = history.replace.bind(history);

  let listeners = [];

  const callListeners = async (...args) => {
    await Promise.all(listeners.map(listener => listener(...args)));
  };

  history.removeAllListeners = () => {
    listeners = [];
  };

  history.onTransition = listener => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(item => item !== listener);
    };
  };

  history.push = async (...args) => {
    const location = createLocation(...args, createKey(), history.location);
    await callListeners(location);
    push(...args);
  };

  history.replace = async (...args) => {
    const location = createLocation(...args, createKey(), history.location);
    await callListeners(location);
    replace(...args);
  };

  return history;
}

export function withRoutes(RouteComponent: *) {
  const RouteComponentWrapper = ({ route, children, ...rest }: *) =>
    <RouteComponent {...rest}>
      {children}
      {renderRoutes(route.routes)}
    </RouteComponent>;
  RouteComponentWrapper.displayName = `${RouteComponent.displayName ||
    RouteComponent.name ||
    'Unknown'}WithRoutes`;
  return RouteComponentWrapper;
}

export function wrapRouteComponents(routes: *) {
  return Array.isArray(routes)
    ? routes.map(route => {
        return route.component
          ? {
              ...route,
              component: withRoutes(route.component),
              routes: wrapRouteComponents(route.routes),
            }
          : {
              ...route,
              routes: wrapRouteComponents(route.routes),
            };
      })
    : routes;
}
