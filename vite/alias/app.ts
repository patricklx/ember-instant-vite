import { compatPath, nodePath } from './utils';
import { projectName } from '../utils';

export const appAlias = [
  {
    find: new RegExp(`^${projectName}\\/config\\/environment$`),
    replacement: compatPath('classic/environment.js')
  },
  {
    find: /^~\/config\/environment$/,
    replacement: compatPath('classic/environment.js')
  },
  {
    find: /^~\//,
    replacement: '/app/'
  },
  {
    find: /^config\/environment$/,
    replacement: nodePath('../config/environment.js')
  },
  {
    find: /^three$/,
    replacement: nodePath('three/src/Three.js')
  }
];

appAlias.push({
  find: new RegExp(`^${projectName}\\/`),
  replacement: '/app/'
});
