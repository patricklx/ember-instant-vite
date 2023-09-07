import fs from 'fs';
import path from 'path';
import configPlugin from './babel/config';
import { babelHotReloadPlugin } from './babel/hot-reload';

const packageJson = require('../package.json');
const projectName = packageJson.name;

function patchExports() {
  const p = path.resolve('.', 'node_modules/ember-cached-decorator-polyfill/package.json');
  if (fs.existsSync(p)) {
    const pkg = JSON.parse(fs.readFileSync(p));
    pkg.exports['./addon/index'] = './addon/index';
    pkg.exports['./addon'] = './addon/index';
    fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
  }
}

patchExports();

const app = require('../ember-cli-build')();
app.options.babel.plugins.push(configPlugin, babelHotReloadPlugin, '@babel/plugin-transform-class-static-block');
try {
  const MacrosNode = require('@embroider/macros/src/node');
  const config = MacrosNode.MacrosConfig.for(app, app.project.root);
  config.finalize();
} catch (e) {
  console.log(e);
}
app.toTree('.', '.');

let emberDeps: string[] = [];
let emberAddons: string[] = [];

function loadAddons(addons: any[]) {
  emberDeps.push(...addons.map(a => a.name));
  emberAddons.push(...addons);
  addons.forEach(a => loadAddons(a.addons));
}
loadAddons(app.project.addons);

emberDeps = [...new Set(emberDeps)];

const scssImporters = [];
if (emberAddons.find(a => a.name === 'ember-hbs-imports')) {
  scssImporters.push(...require('./plugins/ember-hbs-imports').scssImporter);
}
if (emberAddons.find(a => a.name === 'ember-css-modules')) {
  scssImporters.push(...require('./plugins/ember-component-css').scssImporter);
}
if (emberAddons.find(a => a.name === 'ember-css-modules')) {
  scssImporters.push(...require('./plugins/ember-component-css').scssImporter);
}


let isTesting = false;
const setIsTesting = () => isTesting = true;
const getIsTesting = () => isTesting;
const isAddon = fs.existsSync('addon');
const hasSrc = fs.existsSync('src');

console.log('isAddon', isAddon)

export {
  isAddon,
  hasSrc,
  setIsTesting,
  getIsTesting,
  projectName,
  emberDeps,
  emberAddons,
  app,
  scssImporters
};
