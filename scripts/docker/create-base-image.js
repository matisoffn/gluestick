#!/usr/bin/env node

const { execSync } = require('child_process');
const version = require('../../lerna.json').version.replace('v', '');

const tag = `truecar/gluestick:${version}`;
console.log(`Creating Docker base image for ${tag}`);

module.exports = () => {
  console.log('Building docker image...');
  console.log(execSync([
    'docker',
    'build',
    '-f', './scripts/docker/Dockerfile',
    '--force-rm=true',
    '-t', tag,
    '--build-arg', `GLUESTICK_VERSION=${version}`,
    '.',
  ].join(' '), { stdio: 'inherit', env: Object.assign({}, process.env) }));

  console.log('Pushing image to Docker Hub...');
  execSync(`docker push ${tag}`, { stdio: 'inherit', env: Object.assign({}, process.env) });
};
