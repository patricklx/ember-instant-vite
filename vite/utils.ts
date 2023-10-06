import fs from 'fs';
import path from 'path';
import * as SharedInternals from '@embroider/shared-internals';

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

let emberDeps: string[] = [];
let emberAddons: {name; string; packageRoot: string}[] = [];
let app = undefined;

let isTesting = false;
const setIsTesting = () => isTesting = true;
const getIsTesting = () => isTesting;
const isAddon = fs.existsSync('addon');
const hasSrc = fs.existsSync('src');


const cache = path.join(__dirname, '.cache')

function saveToCache(file, content) {
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(`${cache}/${file}`, JSON.stringify(content, null, 2));
}

function hasCacheFor(file) {
  return fs.existsSync(path.join(cache, file));
}

function loadFromCache(file) {
  return JSON.parse(fs.readFileSync(path.join(cache, file)));
}

async function loadFromCacheAsync(file) {
  return JSON.parse(await fs.promises.readFile(path.join(cache, file)));
}


if (hasCacheFor('project.json')) {
  app = loadFromCache('project.json');
  emberAddons = app.project.addons;
  emberDeps = [...new Set(emberAddons.map(x => x.name))];
} else {
  app = require('../ember-cli-build')();
  const configPlugin = path.resolve(path.join(__dirname, './babel/config.js'));
  const babelHotReloadPlugin = path.resolve(path.join(__dirname, './babel/hot-reload.js'));
  let didSetup = false;
  if (app.options.babel.plugins.find(x => x === configPlugin)) {
    didSetup = true;
  }
  const main = app;
  const addon = app.project.addons.find(a => a.name === app.project.name());
  if (!didSetup) {
    app.options.babel.plugins.push(configPlugin);
    // app.options.babel.plugins.push(babelHotReloadPlugin);
    app.options.babel.plugins.push('@babel/plugin-transform-class-static-block');
    if (addon) {
      addon.options.babel.plugins.push('@babel/plugin-transform-class-static-block');
    }

    try {
      const MacrosNode = require('@embroider/macros/src/node');
      const config = MacrosNode.MacrosConfig.for(app, app.project.root);
      config.finalize();
    } catch (e) {
      console.log(e);
    }
  }
  app.options.babel.didSetup = true;
  app.project.root = app.project.root.replaceAll('\\', '/');
  const loadAddons = (addons: any[]) => {
    emberDeps.push(...addons.map(a => a.name));
    emberAddons.push(...addons);
    addons.forEach(addon => {
      let root = addon.root.replaceAll('\\', '/');
      if (root.includes('/node_modules/')) {
        const parts = root.split('/');
        const idx = parts.lastIndexOf('node_modules');
        if (parts[idx + 1].startsWith('@')) {
          root = parts.slice(0, idx + 3).join('/');
        } else {
          root = parts.slice(0, idx + 2).join('/');
        }
      }
      addon.packageRoot = root;
      addon.options = addon.options || {};
      addon.options.babel = addon.options.babel || {};
      addon.options.babel.plugins = (addon.options.babel.plugins || []).slice();
      addon.options['ember-cli-babel'] = addon.options['ember-cli-babel'] || {};
      addon.options['ember-cli-babel'].compileModules = false;
      addon.options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;
      if (!addon.options.babel.plugins.includes(configPlugin)) {
        addon.options.babel.plugins.push(configPlugin);
      }
      let emberBabel = addon.addons.find(a => a.name === 'ember-cli-babel');
      if (addon.pkg['ember-addon'].version === 2) {
        if (main) {
          addon.emberBabelOptions = main.options?.babel;
        }
      } else if (emberBabel) {
        const transpiler = emberBabel.transpileTree('.');
        addon.emberBabelOptions = transpiler.options.babel || transpiler.options;
        if (addon.emberBabelOptions) {
          addon.emberBabelOptions.plugins = addon.emberBabelOptions.plugins.slice()
        } else {
          addon.emberBabelOptions = addon?.options?.babel;
        }
      }
      loadAddons(addon.addons)
    });
  }
  loadAddons(app.project.addons);

  emberDeps = [...new Set(emberDeps)];
  const mapAddon = (x) => ({
    pkg: { 'ember-addon': x.pkg['ember-addon'], version: x.pkg.version, name: x.pkg.name },
    root: x.root,
    packageRoot: x.packageRoot,
    name: typeof x.name === 'string' ? x.name : x.name(),
    emberBabelOptions: x.emberBabelOptions,
    addons: x.addons.map(mapAddon)
  })
  const proj = {
    root: app.project.root,
    name: typeof app.project.name === 'string' ? app.project.name : app.project.name(),
    options: app.project.options,
    addons: emberAddons.map(mapAddon)
  };
  const appJson = {
    options: app.options,
    name: app.name,
    root: app.root,
    trees: app.trees,
    project: proj
  }
  saveToCache('project.json', appJson);
}

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
  allExtensions,
  saveToCache,
  loadFromCache,
  hasCacheFor,
  loadFromCacheAsync
};
