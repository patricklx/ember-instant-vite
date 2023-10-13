import path from 'path';
import MacrosNode from '@embroider/macros/src/node';
import { hasCacheFor, loadFromCache, saveToCache } from './cache';

let emberDeps = [];
let emberAddons = [];
let app;

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
  app.project.name = app.project.name();
  const addon = app.project.addons.find(a => a.name === app.project.name);
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
      const emberBabel = addon.addons.find(a => a.name === 'ember-cli-babel');
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
    name: app.project.name,
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

export {
  emberAddons,
  emberDeps,
  app
}
