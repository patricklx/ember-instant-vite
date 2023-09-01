import config from '~/config/environment';
import pkg from '../../../package.json';
import jquery from 'jquery/dist/jquery';
import ember from 'ember';
import * as polyfill from 'ember-cached-decorator-polyfill/index';
import * as debug from '@ember-data/debug';
import * as runtime from '@glimmer/runtime';
import * as metal from '@ember/-internals/metal/index';
define(`${pkg.name}/config/environment`, [], () => config);
define(`ember-cached-decorator-polyfill/index`, [], () => polyfill);
define(`@ember-data/debug`, [], () => debug);
define(`@ember/-internals/metal/index`, [], () => metal);
define(`@glimmer/runtime`, [], () => runtime);

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
