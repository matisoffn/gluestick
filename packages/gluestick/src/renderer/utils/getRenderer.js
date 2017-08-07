/* @flow */
import type { RenderMethod } from '../../types';

const { renderToString, renderToStaticMarkup } = require('react-dom/server');

module.exports = function getRenderer(
  isEmail: boolean,
  renderMethod?: RenderMethod,
): Function {
  if (renderMethod) {
    return renderMethod;
  }
  return isEmail ? renderToStaticMarkup : renderToString;
};
