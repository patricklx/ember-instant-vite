import { compatPath, nodePath } from './utils';
import { projectName, getIsTesting, isAddon } from '../utils';

export const appAlias = [
  {
    find: new RegExp(`^${(getIsTesting() || isAddon) ? 'dummy' : projectName}\\/config\\/environment$`),
    replacement: compatPath('classic/environment.js')
  },
  {
    find: /^\.\/config\/environment$/,
    replacement: compatPath('classic/environment.js')
  },
  {
    find: /^~\/config\/environment$/,
    replacement: compatPath('classic/environment.js')
  },
  {
    find: /^~\//,
    replacement: (getIsTesting() || isAddon) ? '/tests/dummy/' : '/app/'
  },
  {
    find: /^config\/environment$/,
    replacement: (getIsTesting() || isAddon) ? '/tests/dummy/config/environment.js' : '../config/environment.js'
  },
  {
    find: /^three$/,
    replacement: nodePath('three/src/Three.js')
  }
];

appAlias.push({
  find: new RegExp(`^${projectName}\\/`),
  replacement: isAddon ? '/addon/' : '/app/'
});

if (isAddon) {
  appAlias.push({
    find: new RegExp('^dummy\\/'),
    replacement: '/tests/dummy/'
  });
}

console.log('appAlias', appAlias)
