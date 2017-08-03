/* @flow */

import React, { Component, PropTypes } from 'react';
import { StaticRouter } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { Provider } from 'react-redux';
// import { useScroll } from 'react-router-scroll';

// import prepareRoutesWithTransitionHooks from '../lib/prepareRoutesWithTransitionHooks';

type Props = {
  // httpClient: PropTypes.object.isRequired
  routes: Object,
  store: Object,
};

type State = {
  mounted: boolean,
};

export default class AppBodyRoot extends Component<void, Props, State> {
  static propTypes = {
    // httpClient: PropTypes.object.isRequired,
    routes: PropTypes.object.isRequired,
    store: PropTypes.object.isRequired,
  };

  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      mounted: false,
    };
  }

  componentWillMount() {
    this.setState({ mounted: true });
  }

  componentWillUnmount() {
    this.setState({ mounted: false });
  }

  render() {
    const { routes, store /* , httpClient */ } = this.props;
    const Router = typeof window === 'undefined' ? StaticRouter : BrowserRouter;

    // @TODO: scrolling
    return (
      <Provider store={store}>
        <Router>
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
