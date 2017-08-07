/* @flow */

import React, { Component } from 'react';
import { StaticRouter, Router as OriginalRouter } from 'react-router';
import { matchRoutes, renderRoutes } from 'react-router-config';
import { Provider } from 'react-redux';
import createHistoryWithAsyncHooks from '../lib/createHistoryWithAsyncHooks';
import wrapRouteComponents from '../lib/wrapRouteComponents';
// import { useScroll } from 'react-router-scroll';

type Props = {
  // httpClient: Object
  routes: any[],
  store: Object,
  // eslint-disable-next-line react/no-unused-prop-types
  serverProps?: { location: string, context: {} },
};

type State = {
  mounted: boolean,
};

type History = {
  push: Function,
  replace: Function,
  onTransition: (listener: (location: Object) => Promise<void>) => () => void,
  removeAllListeners: () => void,
};

export default class AppBodyRoot extends Component<void, Props, State> {
  state: State;
  props: Props;
  Router: React.Component<*, *, *>;
  routerProps: {
    history?: History,
    location?: string,
    context?: {},
  };

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
          // @TODO: provide sensible error
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
        {/* $FlowIgnore */}
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

