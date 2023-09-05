import { emberAddons } from '../utils';
import { compatPath, nodePath } from "./utils";

export const externals = [
  'ember-compatibility-helpers',
  'ember-cli-htmlbars',
  '@ember/template-compiler',
  '@embroider/macros'
];

const exclude = ['loader.js'];
const deps = emberAddons.filter(d => !exclude.includes(d.name));
function esc(reg) {
  return reg.replace('/', '\\/');
}

function getMapping(addon) {
  if (addon.pkg['ember-addon'].version !== 2) {
    return [
      {
        find: new RegExp(`^${esc(addon.name)}\\/app`),
        replacement: `${addon.name}/app`
      },
      {
        find: new RegExp(`^${esc(addon.name)}/addon`),
        replacement: `${addon.name}/addon`
      },
      {
        find: new RegExp(`^${esc(addon.name)}`),
        replacement: `${addon.name}/addon`
      }
    ];
  } else {
    return [
      {
        find: new RegExp(`^${esc(addon.name)}$`),
        replacement: nodePath(addon.name) + '/dist'
      },
      {
        find: new RegExp(`^${esc(addon.name)}\\/`),
        replacement: nodePath(addon.name) + '/dist/'
      }
    ];
  }
}

export const addonAliases = [
  {
    find: 'fetch',
    replacement: compatPath('ember-fetch'),
  },
  ...deps.filter(x => !externals.includes(x.name))
    .map((e) => getMapping(e)).flat()
];
