import fs from 'fs';
import path from 'path';
import sparkMd5 from 'spark-md5';
import * as SharedInternals from '@embroider/shared-internals';
import { emberAddons, emberDeps, app } from './setup';
import { hasCacheFor, loadFromCache, saveToCache } from './cache';

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

let isTesting = false;
const setIsTesting = () => isTesting = true;
const getIsTesting = () => isTesting;
const isAddon = fs.existsSync('addon');
const hasSrc = fs.existsSync('src');


const root = require('path').join(app.project.root, app.trees.app, '..');
const packageCache = SharedInternals.RewrittenPackageCache.shared('embroider', root);
const packageJSON = packageCache.get(app.project.root).packageJSON;
if (!packageJSON.dependencies['ember-source']) {
  packageJSON.dependencies['ember-source'] = packageJSON.devDependencies?.['ember-source'] || packageJSON.peerDependencies?.['ember-source'];
}


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


function rootPath(id) {
  id = id.replaceAll('\\', '/')
  let root = app.project.root;
  if (id.includes('/node_modules/')) {
    const parts = id.split('/');
    const idx = parts.lastIndexOf('node_modules');
    if (parts[idx + 1].startsWith('@')) {
      root = parts.slice(0, idx + 3).join('/');
    } else {
      root = parts.slice(0, idx + 2).join('/');
    }
  }
  return root;
}

function relativePath(id) {
  id = id.replaceAll('\\', '/')
  let localId = id;
  let root = app.project.root;
  if (id.includes('/node_modules/')) {
    const parts = id.split('/');
    const idx = parts.lastIndexOf('node_modules');
    if (parts[idx + 1].startsWith('@')) {
      root = parts.slice(0, idx + 3).join('/');
    } else {
      root = parts.slice(0, idx + 2).join('/');
    }
  }
  localId = localId.replace(app.project.root + '/app/', '');
  localId = localId.replace(app.project.root + '/addon/', '');
  let pkgName;
  if (localId.includes('node_modules')) {
    localId = localId.split('node_modules').slice(-1)[0];
    const parts = localId.split('/');
    pkgName = parts[1];
    let offset = 2;
    if (pkgName.startsWith('@')) {
      pkgName = parts.slice(1,3).join('/');
      offset = 3;
    }
    localId = parts.slice(offset).join('/');
    localId = localId.replace(/^addon\//, `${pkgName}/`);
  }
  return localId;
}


const allExtensions = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.hbs', '.handlebars', '.gts', '.gjs'];

export {
  isAddon,
  hasSrc,
  setIsTesting,
  getIsTesting,
  projectName,
  emberDeps,
  emberAddons,
  app,
  scssImporters,
  relativePath,
  rootPath,
  allExtensions
};
