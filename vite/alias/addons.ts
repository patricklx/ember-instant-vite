import { app, emberAddons, isAddon } from '../utils';
import { compatPath, nodePath } from "./utils";

export const externals = [
  'ember-compatibility-helpers',
  'ember-cli-htmlbars',
  '@ember/template-compiler',
  '@embroider/macros',
];

const exclude = ['loader.js'];
const deps = emberAddons.filter(d => !exclude.includes(d.name));
function esc(reg) {
  return reg.replace('/', '\\/');
}

function getMapping(addon) {
  const name = addon.pkg.name;
  if (addon.pkg['ember-addon'].version !== 2) {
    return [{
      find: new RegExp(`^${esc(name)}`),
      replacement: `${name}`
    }]
    return [
      {
        find: new RegExp(`^${esc(name)}\\/app`),
        replacement: `${name}/app`
      },
      {
        find: new RegExp(`^${esc(name)}\\/addon`),
        replacement: `${name}/addon`
      },
      {
        find: new RegExp(`^${esc(name)}/`),
        replacement: `${name}/addon/`
      },
      {
        find: new RegExp(`^${esc(name)}$`),
        replacement: `${name}/addon/`
      }
    ];
  } else {
    return [];
  }
}

export const addonAliases = [
  {
    find: 'fetch',
    replacement: compatPath('ember-fetch'),
  },
  {
    find: 'ember-power-calendar-utils',
    replacement: 'ember-power-calendar/utils',
  }
];
