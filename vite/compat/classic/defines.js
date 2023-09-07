import config from '~/config/environment';
import pkg from '../../../package.json';
import jquery from 'jquery/dist/jquery';
import ember from 'ember';
import * as runtime from '@glimmer/runtime';
import * as metal from '@ember/-internals/metal/index';
import * as modifiers from '@ember/modifier';
import * as helpers from '@ember/helper';

try{
  const modules = await import.meta.glob('/tests/dummy/app/*');
  console.log('modules', modules);
  define(`dummy/config/environment`, [], () => config);
} catch (e) {
  define(`${pkg.name}/config/environment`, [], () => config);
}


try {
  const emberDataGraph = await import('@ember-data/graph/-private/*');
  define('@ember-data/graph/-private', [], () => emberDataGraph);
} catch (e) {}

try {
  const debug = await import('@ember-data/debug/*');
  define(`@ember-data/debug`, [], () => debug);
} catch (e) {}

try {
  const polyfill = await import('ember-cached-decorator-polyfill/index');
  define(`ember-cached-decorator-polyfill/index`, [], () => polyfill);
} catch (e) {}

define(`@ember/-internals/metal/index`, [], () => metal);
define(`@glimmer/runtime`, [], () => runtime);
define(`@ember/modifier`, [], () => modifiers);
define(`@ember/helper`, [], () => helpers);

globalThis.EmberENV = Object.assign({
  FEATURES: {},
  EXTEND_PROTOTYPES: false,
  _JQUERY_INTEGRATION: false,
  _APPLICATION_TEMPLATE_WRAPPER: false,
  _DEFAULT_ASYNC_OBSERVERS: true,
  _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true,
}, config.EmberENV || {}, globalThis.EmberENV || {});

globalThis.$ = jquery;
globalThis.jQuery = jquery;
globalThis.Ember = ember;


const testWaiters = await import('@ember/test-waiters');
define(`@ember/test-waiters`, [], () => testWaiters);
