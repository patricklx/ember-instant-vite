import { emberAddons } from '../utils';
import { compatPath, nodePath } from "./utils";

export const externals = [
  'ember-compatibility-helpers',
  'ember-cli-htmlbars',
  '@ember/template-compiler',
  '@embroider/macros',
  'ember-cli-addon-docs/app-files',
  'ember-cli-addon-docs/addon-files',
];

const exclude = ['loader.js'];
const deps = emberAddons.filter(d => !exclude.includes(d.name));
function esc(reg) {
  return reg.replace('/', '\\/');
}

function getMapping(addon) {
  if (addon.name === 'ember-modifier') {
    console.log(addon.name, addon.root, addon.pkg['ember-addon'].version);
  }
  if (addon.pkg['ember-addon'].version !== 2) {
    return [
      {
        find: new RegExp(`^${esc(addon.name)}\\/app`),
        replacement: `${addon.name}/app`
      },
      {
        find: new RegExp(`^${esc(addon.name)}\\/addon`),
        replacement: `${addon.name}/addon`
      },
      {
        find: new RegExp(`^${esc(addon.name)}/`),
        replacement: `${addon.name}/addon/`
      },
      {
        find: new RegExp(`^${esc(addon.name)}$`),
        replacement: `${addon.name}/addon/`
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
  },
  ...deps.filter(x => !externals.includes(x.name))
    .map((e) => getMapping(e)).flat()
];
