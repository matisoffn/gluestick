/* @flow */
import type { Context, Request } from '../../types';

const { matchRoutes } = require('react-router-config');

module.exports = (context: Context, req: Request, routes: any[]) => {
  return new Promise((resolve, reject) => {
    const branch = matchRoutes(routes, req.url);

    if (!branch.length) {
      reject(new Error(`No matching routes found for url ${req.url}`));
    }

    resolve({ ...branch[branch.length - 1], branch });
    //   (error: any, redirectLocation: Object, renderProps: Object) => {
    //     if (error) {
    //       reject(error);
    //       return;
    //     }

    //     resolve({ redirectLocation, renderProps });
    //   },
    // );
  });
};
