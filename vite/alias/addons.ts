import { emberDeps } from '../utils';
import { compatPath } from './utils';

export const externals = [
  'ember-compatibility-helpers',
  'ember-cli-htmlbars',
  '@ember/template-compiler',
  '@embroider/macros'
];

const deps = emberDeps.filter(d => d !== 'loader.js');

export const addonAliases = [
  {
    find: 'fetch',
    replacement: compatPath('ember-fetch'),
  },
  ...deps.filter(x => !externals.includes(x)).map((e) => [
    {
      find: new RegExp(`^${e}\\/app`),
      replacement: `${e}/app`
    },
    {
      find: new RegExp(`^${e}\\/addon`),
      replacement: `${e}/addon`
    },
    {
      find: new RegExp(`^${e}`),
      replacement: `${e}/addon`
    }
  ]).flat()
];
