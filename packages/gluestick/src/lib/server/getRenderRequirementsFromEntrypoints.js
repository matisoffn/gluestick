import { parse as parseURL } from 'url';
import { getHttpClient } from 'gluestick-shared';
import { getWebpackEntries } from '../buildWebpackEntries';
import isChildPath from '../isChildPath';


const cachedEntryPoints = getWebpackEntries();

/**
 * Sort through all of the entry points based on the number of `/` characters
 * found in the url. It will test the most deeply nested entry points first
 * while finally falling back to the default index parameter.
 */
const getSortedEntries = () => {
  return Object.keys(getWebpackEntries()).sort((a, b) => {
    const bSplitLength = b.split('/').length;
    const aSplitLength = a.split('/').length;
    if (bSplitLength === aSplitLength) {
      return b.length - a.length;
    }

    return bSplitLength - aSplitLength;
  });
};

// Cache this result so it only runs once in production
const cachedSortedEntries = getSortedEntries();

/**
 * This method takes the server request object, determines which entry point
 * the server should use for rendering and then prepares the necessary
 * variables that the server needs to render. These variables include Index,
 * store, getRoutes and fileName.
 */
export default (req, res, config = {}, logger) => {
  logger.warn(process.env.COMPILATION_TIMESTAMP);
  const httpClient = getHttpClient(config.httpClient, req, res);
  const { path: urlPath } = parseURL(req.url);
  let sortedEntries;
  let entryPoints;
  if (process.env.NODE_ENV === 'production') {
    sortedEntries = cachedSortedEntries;
    entryPoints = cachedEntryPoints;
  } else {
    sortedEntries = getSortedEntries();
    entryPoints = getWebpackEntries();
  }

  logger.debug('Getting webpack entries');

  /**
   * Loop through the sorted entry points and return the variables that the
   * server needs to render based on the best matching entry point.
   */
  logger.debug('Looping through sorted entry points');
  for (const path of sortedEntries) {
    if (isChildPath(path, urlPath)) {
      const { routes, index, fileName, filePath } = entryPoints[path];

      logger.debug('Found entrypoint and performing requires for', fileName, index, filePath, routes);
      logger.warn(index);
      return {
        Index: require(req.query.import).default,
        // store: require(filePath).getStore(httpClient),
        // getRoutes: require(routes).default,
        fileName,
      };
    }
  }

  return null;
};
