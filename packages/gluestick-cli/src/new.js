/* @flow */

// @TODO tests

const path = require('path');
const fs = require('fs');
const mkdir = require('mkdirp');
const spawn = require('cross-spawn');
const commander = require('commander');
const glob = require('glob');
const generate = require('gluestick-generators').default;
const fetch = require('node-fetch');
const rimraf = require('rimraf');

const ensureDevelopmentPathIsValid = (pathToGluestickRepo, logger) => {
  let gluestickPackage = {};
  try {
    gluestickPackage = require(path.join(pathToGluestickRepo, 'package.json'));
  } catch (error) {
    logger.fatal(
      `Development GlueStick path ${pathToGluestickRepo} is not valid`,
    );
  }
  if (gluestickPackage.name !== 'gluestick-packages') {
    logger.fatal(`${pathToGluestickRepo} is not a path to GlueStick`);
  }
};

const getDevelopmentDependencies = (
  { dev }: { dev: string },
  pathToGluestickPackages,
) => {
  return glob
    .sync('*', { cwd: pathToGluestickPackages })
    .filter(name => name !== 'gluestick-cli')
    .reduce((acc, key) => {
      return { ...acc, [key]: `file:${path.join('..', dev, 'packages', key)}` };
    }, {});
};

type Options = {
  preset?: string,
  dev?: string,
  skipMain: boolean,
  npm: boolean,
};

module.exports = (appName: string, options: Options, logger: Function) => {
  const preset: string = options.preset || 'default';
  const api: string = 'http://registry.npmjs.org';
  Promise.all([
    fetch(`${api}/gluestick`),
    fetch(`${api}/gluestick-preset-${preset}`),
  ])
    .then(responses => Promise.all(responses.map(res => res.json())))
    .then(payloads => {
      const latestGluestickVersion = payloads[0]['dist-tags'].latest;
      const presetDependencies =
        payloads[1].versions[latestGluestickVersion].gsProjectDependencies;
      let gluestickDependencies = {
        gluestick: latestGluestickVersion,
      };

      if (options.dev) {
        // $FlowIgnore `options.dev` is explicitly check for not being null
        const pathToGluestickRepo = path.join(
          process.cwd(),
          appName,
          '..',
          options.dev,
        );
        const pathToGluestickPackages = path.join(
          pathToGluestickRepo,
          'packages',
        );
        ensureDevelopmentPathIsValid(pathToGluestickRepo, logger);
        // $FlowIgnore `options.dev` is explicitly check for not being null
        gluestickDependencies = getDevelopmentDependencies(
          options,
          pathToGluestickPackages,
        );
      }

      const pathToApp = path.join(process.cwd(), appName);
      if (fs.existsSync(pathToApp)) {
        logger.fatal(`Directory ${pathToApp} already exists`);
      }

      mkdir.sync(path.join(process.cwd(), appName));

      const generatorOptions = {
        appName,
        preset,
        gluestickDependencies,
        presetDependencies,
      };

      process.chdir(appName);
      try {
        generate(
          {
            generatorName: 'packageJson',
            entityName: 'package',
            options: generatorOptions,
          },
          undefined,
          {
            successMessageHandler: () => {},
          },
        );

        const isYarnAvailable = !spawn.sync('yarn', ['-V']).error;
        if (!options.npm && !isYarnAvailable) {
          logger.warn(
            'You are installing dependencies using npm, consider using yarn.',
          );
        }

        spawn.sync(
          !options.npm && isYarnAvailable ? 'yarn' : 'npm',
          ['install'],
          {
            cwd: process.cwd(),
            stdio: 'inherit',
          },
        );
        // Remove --npm or -n options cause this is no longer needed in
        // gluestick new command.
        const args = commander.rawArgs
          .slice(2)
          .filter(v => v !== '--npm' && v !== '-n');

        spawn.sync('./node_modules/.bin/gluestick', args, {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
      } catch (error) {
        rimraf.sync(
          // Make sure CWD includes appName, we don't want to remove other files
          process.cwd().includes(appName)
            ? process.cwd()
            : path.join(process.cwd(), appName),
        );
        console.error(error);
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error(error.message);
      logger.fatal(
        'This error may occur due to the following reasons:' +
          ` -> Cannot connect or make request to '${api}'` +
          ' -> Specified preset was not found',
      );
    });
};
