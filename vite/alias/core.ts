import { compatPath, emberGlimmerDepsPackages, emberPackages, nodePath } from "./utils";


export const coreAlias = [
  ...emberPackages().map((pkg) => ({
    find: `@ember/${pkg}`,
    replacement: nodePath(`ember-source/dist/packages/@ember/${pkg}`),
  })),
  ...emberGlimmerDepsPackages().map((pkg) => ({
    find: `@glimmer/${pkg}`,
    replacement: nodePath(
      `ember-source/dist/dependencies/@glimmer/${pkg}`
    ),
  })),
  {
    find: 'ember-template-compiler',
    replacement:
      'ember-source/dist/ember-template-compiler.js',
  },
  {
    find: 'tracked-toolbox',
    replacement: nodePath('tracked-toolbox/dist')
  },
  {
    find: '@glimmer/validator',
    replacement: nodePath('@glimmer/validator/dist/modules/es2017'),
  },
  {
    find: /^ember-testing$/,
    replacement: 'ember-source/dist/packages/ember-testing',
  },
  {
    find: /^ember-testing\//,
    replacement: 'ember-source/dist/packages/ember-testing/',
  },
  {
    find: 'ember-cli-version-checker',
    replacement: compatPath('ember-cli-version-checker/index.ts'),
  },
  {
    find: 'ember-cli-test-loader/test-support/index',
    replacement: compatPath('ember-cli-test-loader/index.ts'),
  },
  {
    find: 'ember-qunit-styles/container.css',
    replacement: nodePath(
      'ember-qunit/vendor/ember-qunit/test-container-styles.css'
    ),
  },
  {
    find: /^@ember\/test-helpers$/,
    replacement:
      '@ember/test-helpers/addon-test-support/@ember/test-helpers',
  },
  {
    find: /^@ember\/test-waiters$/,
    replacement: '@ember/test-waiters/addon/@ember/test-waiters',
  },
  { find: 'ember-qunit', replacement: 'ember-qunit/addon-test-support' },
  {
    find: 'qunit-dom',
    replacement: 'qunit-dom/dist/addon-test-support/index.js',
  },
  {
    find: '@glimmer/tracking/primitives/cache',
    replacement: nodePath(
      'ember-source/dist/packages/@glimmer/tracking/primitives/cache.js'
    ),
  },
  {
    find: /@glimmer\/tracking$/,
    replacement: nodePath('ember-source/dist/packages/@glimmer/tracking'),
  },
  // {
  //   find: /^@embroider\/util$/,
  //   replacement: compatPath('embroider-util/index.ts'),
  // },
  {
    find: /^@embroider\/macros\/es-compat2$/,
    replacement: nodePath('@embroider/macros/src/addon/es-compat2.js'),
  },
  {
    find: /^@embroider\/macros\/es-compat$/,
    replacement: nodePath('@embroider/macros/src/addon/es-compat2.js'),
  },
  {
    find: /^@embroider\/macros\/runtime$/,
    replacement: nodePath('@embroider/macros/src/addon/runtime'),
  },
  { find: /^ember$/, replacement: 'ember-source/dist/packages/ember' },
  {
    find: /^ember\/version$/,
    replacement: 'ember-source/dist/packages/ember/version',
  },
  {
    find: /^ember-component-manager$/,
    replacement:
      '@glimmer/component/addon/-private/ember-component-manager',
  },
  {
    find: /^@glimmer\/component$/,
    replacement: '@glimmer/component/addon/-private/component',
  },
  {
    find: /^@glimmer\/env$/,
    replacement: compatPath('glimmer-env'),
  },
  {
    find: /^backburner$/,
    replacement: nodePath('backburner.js/dist/es6/backburner.js'),
  },
  {
    find: /^backburner.js$/,
    replacement: nodePath('backburner.js/dist/es6/backburner.js'),
  },
  {
    find: /^ember-data\/version$/,
    replacement: compatPath('classic/ember-data-version.js'),
  },
  {
    find: /^ember-data\/package.json/,
    replacement: 'ember-data/package.json',
  },
  {
    find: /^@ember-data\/private-build-infra$/,
    replacement: compatPath('ember-data-private-build-infra'),
  },
  {
    find: /^ember-load-initializers$/,
    replacement: nodePath('ember-load-initializers/addon/index.ts')
  },
  {
    find: 'require',
    replacement: compatPath('require/index.ts'),
  },
  {
    find: /^jquery$/,
    replacement: compatPath('jquery'),
  },
];
