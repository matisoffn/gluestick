/* @flow */
import type { Context, Request, RenderOutput, RenderMethod } from '../types';

const React = require('react');
const Oy = require('oy-vey').default;
const { renderToStaticMarkup } = require('react-dom/server');
const linkAssets = require('./helpers/linkAssets');
const getRequestDataFactory = require('./utils/getRequestDataFactory');
const getRenderer = require('./utils/getRenderer');

type AppParams = {
  AppEntryPoint: Object,
  appName: string,
  store: Object,
  routes: Function,
  httpClient: Object,
  currentRoute: Object,
};

type BodyParams = {
  Body: Object,
  BodyWrapper: Object,
  bodyConfig: Object,
  envVariables: any[],
  entriesPlugins: { plugin: Function, meta: Object }[],
};

type AssetsParams = {
  assets: Object,
  loadjsConfig: Object,
};

type MiscParams = {
  renderMethod?: RenderMethod,
  cacheManager: Object,
};

module.exports = (
  context: Context,
  request: Request,
  {
    AppEntryPoint,
    appName,
    store,
    routes,
    httpClient,
    currentRoute,
  }: AppParams,
  { Body, BodyWrapper, bodyConfig, envVariables }: BodyParams,
  { assets, loadjsConfig }: AssetsParams,
  { renderMethod, cacheManager }: MiscParams = {},
): RenderOutput => {
  const { styleTags, scriptTags } = linkAssets(
    context,
    appName,
    assets,
    loadjsConfig,
  );
  const isEmail = !!currentRoute.email;

  // @TODO: uncomment this
  // const rootWrappers = entriesPlugins
  //   .filter(plugin => plugin.meta.wrapper)
  //   .map(({ plugin }) => plugin);

  // Render `Body` component from project, which also renders `AppBodyRoot` inside.
  const routerContext = {};
  const renderResults: Object = getRenderer(isEmail, renderMethod)(
    <Body
      config={bodyConfig}
      store={store}
      routes={routes}
      httpClient={httpClient}
      serverProps={{ location: request.url, context: routerContext }}
      getRequestData={getRequestDataFactory(request)}
    />,
    styleTags,
  );

  // Inject rendered body and head elemens into documents template from
  // the project.
  const rootElement = (
    <AppEntryPoint
      body={
        <BodyWrapper
          html={renderMethod ? renderResults.body : renderResults}
          initialState={store.getState()}
          isEmail={isEmail}
          envVariables={envVariables}
          scriptTags={scriptTags}
        />
      }
      head={isEmail ? null : renderResults.head || styleTags}
      request={request}
    />
  );

  const docType: string = currentRoute.docType || '<!doctype html>';

  let responseString: string;
  if (isEmail) {
    const generateCustomTemplate = ({ bodyContent }) => {
      return `${docType}${bodyContent}`;
    };
    responseString = Oy.renderTemplate(rootElement, {}, generateCustomTemplate);
  } else {
    responseString = `${docType}${renderToStaticMarkup(rootElement)}`;
  }
  if (currentRoute.cache) {
    cacheManager.setCacheIfProd(request, responseString, currentRoute.cacheTTL);
  }

  return {
    routerContext,
    responseString,
    rootElement, // only for testing
  };
};
