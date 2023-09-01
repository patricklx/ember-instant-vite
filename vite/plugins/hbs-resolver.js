import path from 'path';
import { projectName, app } from '../utils';

const fileRegex = /.*\.(hbs)$/;



function tpl(raw, id, isProd) {
  const code = raw.split('`').join('\\`');

  const moduleName = id.includes('node_modules')
    ? id.split('node_modules/')[1]
    : id.split('src').pop();
  const processors = [...app.registry.registry.template].map(t => t.toTree(id, id));
  return processors.reduce((prev, p) => p.processString(prev, moduleName), code);
}

export default function hbsResolver(isProd) {
  return {
    name: 'hbs-resolver',
    enforce: 'pre',
    transform(src, id) {
      if (fileRegex.test(id, id)) {
        const code = tpl(src, id, isProd);
        return {
          code,
          map: null, // provide source map if available
        };
      }
    },
  };
}
