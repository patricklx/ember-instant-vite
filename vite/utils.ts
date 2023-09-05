import fs from 'fs';
import path from 'path';
import configPlugin from './babel/config';
import { babelHotReloadPlugin } from './babel/hot-reload';

const packageJson = require('../package.json');
const projectName = packageJson.name;

function patchExports() {
  const p = path.resolve('.', 'node_modules/ember-cached-decorator-polyfill/package.json');
  const pkg = JSON.parse(fs.readFileSync(p));
  pkg.exports['./addon/index'] = './addon/index';
  pkg.exports['./addon'] = './addon/index';
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
}

patchExports();

const app = require('../ember-cli-build')();
app.options.babel.plugins.push(configPlugin, babelHotReloadPlugin, '@babel/plugin-transform-class-static-block');
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

export {
  projectName,
  emberDeps,
  emberAddons,
  app
};
