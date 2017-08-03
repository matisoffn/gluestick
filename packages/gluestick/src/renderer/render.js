/* @flow */
import type { Context, Request, RenderOutput, RenderMethod } from '../types';

const React = require('react');
const { RouterContext } = require('react-router');
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

type EntryRequirements = {
  AppEntryPoint: Object,
  entryName: string,
  store: Object,
  routes: Function,
  httpClient: Object,
};
type WrappersRequirements = {
  Body: Object,
  BodyWrapper: Object,
  entryWrapperConfig: Object,
  envVariables: any[],
  entriesPlugins: { plugin: Function, meta: Object }[],
};
type AssetsCacheOpts = {
  assets: Object,
  loadjsConfig: Object,
  cacheManager: Object,
};

module.exports = (
  context: Context,
  req: Request,
  { AppEntryPoint, entryName, store, routes, httpClient }: EntryRequirements,
  { currentRoute }: { renderProps: Object, currentRoute: Object },
  { Body, BodyWrapper, entryWrapperConfig, envVariables }: WrappersRequirements,
  { assets, loadjsConfig, cacheManager }: AssetsCacheOpts,
  { renderMethod }: { renderMethod?: RenderMethod } = {},
): RenderOutput => {
  const { styleTags, scriptTags } = linkAssets(
    context,
    entryName,
    assets,
    loadjsConfig,
  );
  const isEmail = !!currentRoute.email;
  // const routerContext = <RouterContext {...renderProps} />;
  // const rootWrappers = entriesPlugins
  //   .filter(plugin => plugin.meta.wrapper)
  //   .map(({ plugin }) => plugin);

  const renderResults: Object = getRenderer(isEmail, renderMethod)(
    <Body
      config={entryWrapperConfig}
      store={store}
      routes={routes}
      httpClient={httpClient}
      rootWrappersOptions={{
        userAgent: req.headers['user-agent'],
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
      req={req}
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
    cacheManager.setCacheIfProd(req, responseString, currentRoute.cacheTTL);
  }
  return {
    responseString,
    rootElement, // only for testing
  };
};
