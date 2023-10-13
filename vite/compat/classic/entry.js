import './content-for';
import 'jquery/dist/jquery';
import './loader';
import './dummy';
import './defines';
import './init';
import './inspector';
import './addons';
import app from './app';
import './styles';
import config from 'config/environment';
import pkg from '../../../package.json';

if (!globalThis.isTesting) {
  app.create({
    'LOG_ACTIVE_GENERATION': true,
    'LOG_VIEW_LOOKUPS': true,
    'name': pkg.name,
    'version': config.APP?.version
  });
};
