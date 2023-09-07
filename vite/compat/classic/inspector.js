import * as computed from '@ember/object/computed';
import * as runloop from '@ember/runloop';
import * as metal from '@ember/-internals/metal';
import * as inst from '@ember/instrumentation';
import * as view from '@ember/-internals/views';
import * as ref from '@glimmer/reference';
import * as val from '@glimmer/validator';
import ember from 'ember';
import pkg from '../../../package.json';

ember.Application.initializers = {};

let name = pkg.name;

try {
  const modules = await import.meta.glob('/tests/dummy/*.js');
  if (modules['tests/dummy/app.js']) {
    name = 'dummy';
  }
} catch (e) {}

try {
  const debug = await import('@ember-data/debug');
  define(`${name}/data-adapter`, [], () => debug);
} catch (e) {
}

try {
  const debug = await import('@ember-data/debug');
  define(`${name}/data-adapter`, [], () => debug);
} catch (e) {
}



define('ember', [], () => ember);
define('@ember/object/computed', [], () => computed);
define('@ember/runloop', [], () => runloop);
define('@ember/-internals/metal', [], () => metal);
define('@ember/instrumentation', [], () => inst);
define('@ember/-internals/views', [], () => view);
define('@glimmer/reference', [], () => ref);
define('@glimmer/validator', [], () => val);
