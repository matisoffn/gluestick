/* @flow */

import type {
  Context,
  Request,
  Response,
  Entries,
  EntriesConfig,
  AppConfig,
  RenderOutput,
  CacheManager,
  GSHooks,
  ServerPlugin,
  RenderMethod,
  ComponentsCachingConfig,
} from '../types';

const render = require('./render');
const getAppConfig = require('./helpers/getAppConfig');
const matchRoute = require('./helpers/matchRoute');
const { getHttpClient, createStore, runOnEnter } = require('../../shared');
const { showHelpText, MISSING_404_TEXT } = require('./helpers/helpText');
const setHeaders = require('./response/setHeaders');
const errorHandler = require('./helpers/errorHandler');
const getCacheManager = require('./helpers/cacheManager');
const getStatusCode = require('./response/getStatusCode');
const createPluginUtils = require('../plugins/utils');
const composeWithHooks = require('./utils/composeWithHooks');

const isProduction = process.env.NODE_ENV === 'production';

type Options = {
  envVariables: string[],
  httpClient: Object,
  entryWrapperConfig: Object,
  reduxMiddlewares: any[],
  thunkMiddleware: ?Function,
};

type EntriesArgs = {
  entries: Entries,
  entriesConfig: EntriesConfig,
  entriesPlugins: Object[],
};

module.exports = async (
  { config, logger }: Context,
  request: Request,
  response: Response,
  { entries, entriesConfig, entriesPlugins }: EntriesArgs,
  { Body, BodyWrapper }: { Body: Object, BodyWrapper: Object },
  { assets, loadjsConfig }: { assets: Object, loadjsConfig: Object },
  options: Options = {
    envVariables: [],
    httpClient: {},
    entryWrapperConfig: {},
    reduxMiddlewares: [],
    thunkMiddleware: null,
  },
  { hooks }: { hooks: GSHooks },
  serverPlugins: ?(ServerPlugin[]),
  cachingConfig: ?ComponentsCachingConfig,
) => {
  /**
   * TODO: better logging
   */
  const cacheManager: CacheManager = getCacheManager(logger, isProduction);
  try {
    // If we have cached item then render it.
    cacheManager.enableComponentCaching(cachingConfig);
    const cachedResponse: string | null = composeWithHooks(
      cacheManager.getCachedIfProd(request),
      hooks.preRenderFromCache,
    );
    if (cachedResponse) {
      response.send(cachedResponse);
      return;
    }

    const appConfig: AppConfig = composeWithHooks(
      getAppConfig({ config, logger }, request, entries),
      hooks.postRenderRequirements,
    );

    // @TODO: refactor, apps config should be in js file and as an array
    const httpClientOptions =
      appConfig.config && appConfig.config.httpClient
        ? appConfig.config.httpClient
        : options.httpClient;
    const httpClient: Function = getHttpClient(
      httpClientOptions,
      request,
      response,
    );

    // @TODO: refactor, redux options should be in app config
    // Allow to specify different redux config
    const reduxOptions =
      appConfig.config && appConfig.config.reduxOptions
        ? appConfig.config.reduxOptions
        : {
            middlewares: options.reduxMiddlewares,
            thunk: options.thunkMiddleware,
          };

    // @TODO: refactor?
    const store: Object = createStore(
      httpClient,
      () => appConfig.reducers,
      reduxOptions.middlewares,
      cb =>
        module.hot &&
        // $FlowFixMe
        module.hot.accept(entriesConfig[appConfig.key].reducers, cb),
      // $FlowFixMe
      !!module.hot,
      reduxOptions.thunk,
    );

    const routes = appConfig.routes(store, httpClient);

    let route;
    let branch;
    try {
      const results = await matchRoute({ config, logger }, request, routes);
      route = results.route;
      branch = results.branch;
    } catch (error) {
      // @TODO: refactor
      // This is only hit if there is no 404 handler in the react routes. A
      // not found handler is included by default in new projects.
      showHelpText(MISSING_404_TEXT, logger);
      response.sendStatus(404);
      return;
    }

    // const renderPropsAfterHooks: Object = hooksHelper(
    //   hooks.postRenderProps,
    //   renderProps,
    // );
    // if (redirectLocation) {
    //   hooksHelper(hooks.preRedirect, redirectLocation);
    //   response.redirect(
    //     301,
    //     `${redirectLocation.pathname}${redirectLocation.search}`,
    //   );
    //   return Promise.resolve();
    // }

    // if (!renderPropsAfterHooks) {
    //   // This is only hit if there is no 404 handler in the react routes. A
    //   // not found handler is included by default in new projects.
    //   showHelpText(MISSING_404_TEXT, logger);
    //   response.sendStatus(404);
    //   return Promise.resolve();
    // }

    await runOnEnter(store, branch, request);

    route = composeWithHooks(route, hooks.postGetCurrentRoute);
    setHeaders(response, route);

    // @TODO: refactor
    let renderMethod: RenderMethod;
    const pluginUtils = createPluginUtils(logger);
    const renderMethodFromPlugins =
      serverPlugins && pluginUtils.getRenderMethod(serverPlugins);
    if (renderMethodFromPlugins) {
      renderMethod = renderMethodFromPlugins;
    }

    const statusCode: number = getStatusCode(store, route);

    const output: RenderOutput = composeWithHooks(
      render(
        { config, logger },
        request,
        {
          AppEntryPoint: appConfig.Component,
          entryName: appConfig.name,
          store,
          routes,
          httpClient,
        },
        { renderProps: {} /* renderPropsAfterHooks */, currentRoute: route },
        {
          Body,
          BodyWrapper,
          entriesPlugins,
          entryWrapperConfig: options.entryWrapperConfig,
          envVariables: options.envVariables,
        },
        { assets, loadjsConfig, cacheManager },
        { renderMethod },
      ),
      hooks.postRender,
    );
    response.status(statusCode).send(output.responseString);
    return;
  } catch (error) {
    composeWithHooks(error, hooks.error);
    logger.error(error instanceof Error ? error.stack : error);
    errorHandler({ config, logger }, request, response, error);
  }
};
