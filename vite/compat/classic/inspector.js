import * as computed from '@ember/object/computed';
import * as runloop from '@ember/runloop';
import * as metal from '@ember/-internals/metal';
import * as inst from '@ember/instrumentation';
import * as view from '@ember/-internals/views';
import * as ref from '@glimmer/reference';
import * as val from '@glimmer/validator';
import ember from 'ember';
import debug from '@ember-data/debug';
import { name } from '../../../package.json';

ember.Application.initializers = {};

define(`${name}/data-adapter`, [], () => debug);
define('ember', [], () => ember);
define('@ember/object/computed', [], () => computed);
define('@ember/runloop', [], () => runloop);
define('@ember/-internals/metal', [], () => metal);
define('@ember/instrumentation', [], () => inst);
define('@ember/-internals/views', [], () => view);
define('@glimmer/reference', [], () => ref);
define('@glimmer/validator', [], () => val);
