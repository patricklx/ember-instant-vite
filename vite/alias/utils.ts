import fs from 'node:fs';
import path from 'path';

const rootDir = path.resolve('.');
export function nodePath(name: string) {
  return path.join(rootDir, 'node_modules', name);
}
export function compatPath(name: string) {
  return path.join(rootDir, 'vite', 'compat', name);
}



export function emberGlimmerDepsPackages() {
  return fs
    .readdirSync('node_modules/ember-source/dist/dependencies/@glimmer')
    .filter((el) => !el.includes('env.'))
    .map((el) => el.replace('.js', ''));
}

export function emberPackages() {
  return fs.readdirSync('node_modules/ember-source/dist/packages/@ember');
}

export function emberPackageDeps() {
  return fs.readdirSync('node_modules/ember-source/dist/dependencies')
      .filter(el => el !== '@glimmer')
}

export function eDataPackages() {
  const els = fs.readdirSync('node_modules/@ember-data');
  return els.filter((e) => e !== 'private-build-infra');
}

export function localScopes() {
  return [
    'addons',
    'authenticators',
    'models',
    'components',
    'config',
    'controllers',
    'helpers',
    'initializers',
    'instance-initializers',
    'modifiers',
    'routes',
    'services',
    'templates',
    'utils',
  ];
}
