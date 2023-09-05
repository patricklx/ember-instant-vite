import 'jquery/dist/jquery';
import './loader';
import './defines';
import './init';
import './inspector';
import app from '../../../app/app';
import './app';
import './addons';
import './styles';
import config from 'config/environment';
import pkg from '../../../package.json';
import router from '../../../app/router';

define(pkg.name + '/router', [], () => router);

app.create({
  'LOG_ACTIVE_GENERATION': true,
  'LOG_VIEW_LOOKUPS': true,
  'name': pkg.name,
  'version': config.APP?.version
});
