/* @flow */
import type { Context, Request, RenderOutput, RenderMethod } from '../types';

const React = require('react');
const Oy = require('oy-vey').default;
const { renderToString, renderToStaticMarkup } = require('react-dom/server');
const linkAssets = require('./helpers/linkAssets');

const getRenderer = (
  isEmail: boolean,
  renderMethod?: RenderMethod,
): Function => {
  if (renderMethod) {
    return renderMethod;
  }
  return isEmail ? renderToStaticMarkup : renderToString;
};

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
  // const routerContext = <RouterContext {...renderProps} />;
  // const rootWrappers = entriesPlugins
  //   .filter(plugin => plugin.meta.wrapper)
  //   .map(({ plugin }) => plugin);

  const routerContext = {};
  const renderResults: Object = getRenderer(isEmail, renderMethod)(
    <Body
      config={bodyConfig}
      store={store}
      routes={routes}
      serverProps={{ location: request.url, context: routerContext }}
      httpClient={httpClient}
      rootWrappersOptions={{
        userAgent: request.headers['user-agent'],
      }}
    />,
    styleTags,
  );

  // Grab the html from the project which is stored in the root
  // folder named Index.js. Pass the body and the head to that
  // component. `head` includes stuff that we want the server to
  // always add inside the <head> tag.
  //
  // Bundle it all up into a string, add the doctype and deliver
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
