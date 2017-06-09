#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * With npm@4 it should be:
 *   __dirname     /Users/<userName></userName>/Documents/<gluestickApp>/node_modules/gluestick
 *   process.cwd() /Users/<userName></userName>/Documents/<gluestickApp>
 * but with npm@5 it will be installed in global cache and symlinked to project directory,
 * so we just need to check if the `node_modules/gluestick` directory in currect project
 * is a symlink.
 */
const isInstalledGlobally = (
  !__dirname.startsWith(process.cwd()) && // npm@4 check
  !fs.lstatSync(path.join(process.cwd(), 'node_modules/gluestick')).isSymbolicLink() // npm@5 check
);

if (isInstalledGlobally) {
  const red = require('chalk').red;
  console.log(red('It looks like you\'ve installed the `gluestick` package globally,'));
  console.log(red('but `gluestick` is meant to be installed locally as a dependency.'));
  console.log(red('For proper functionality, please uninstall `gluestick`'));
  console.log(red('and install `gluestick-cli` globally instead.'));
  process.exit(0);
}

require('babel-polyfill');
require('../build/cli');

