import { app } from '../utils';
import config from '../babel/config';
import fs from 'node:fs';

app.options['ember-cli-babel'] = app.options['ember-cli-babel'] || {};
app.options['ember-cli-babel'].compileModules = false;
app.options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;

const appJs = [...app.registry.registry.js].reverse();
let jsExtensions = appJs.map(j => j.ext).flat().filter(x => !!x);
const jsProcessors = [...appJs].reverse().map(j => {
  const plugin = j.toTree('./.', './.');
  if (plugin.extensions) {
    jsExtensions.push(...plugin.extensions);
  }
  return plugin.processString?.bind(plugin);
}).filter(x => !!x);


const template = [...app.registry.registry.template].reverse();
let templateExtensions = template.map(j => j.ext).flat().filter(x => !!x);
const templateProcessors = [...template].reverse().map(j => {
  const plugin = j.toTree('./.', './.');
  if (plugin.extensions) {
    templateExtensions.push(...plugin.extensions);
  }
  return plugin.processString?.bind(plugin);
}).filter(x => !!x);

const mapping = {};

function loadAddons(addons) {
  addons.forEach((addon) => {
    mapping[addon.name] = mapping[addon.name] || addon;
    addon.options = addon.options || {};
    addon.options.babel = addon.options.babel || {};
    addon.options.babel.plugins = addon.options.babel.plugins || [];
    addon.options.babel.plugins.push(config());
    addon.options['ember-cli-babel'] = addon.options['ember-cli-babel'] || {};
    addon.options['ember-cli-babel'].compileModules = false;
    addon.options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;
    loadAddons(addon.addons);
    if (!addon.registry?.registry) return;
    if (addon.registry.registry.template) {
      const tpl = [...addon.registry.registry.template].reverse();
      templateExtensions.push(...tpl.map(j => j.ext).flat().filter(x => !!x));

      const processors = [...tpl].reverse().map(j => {
        const plugin = j.toTree('./.', './.');
        if (plugin.extensions) {
          templateExtensions.push(...plugin.extensions);
        }
        if (plugin.processString) {
          Object.defineProperty(plugin, 'inputPaths', {
            value: [addon.name]
          });
          return plugin.processString.bind(plugin);
        }
      }).filter(x => !!x);
      addon.templateProcessors = processors;
    } else {
      addon.templateProcessors = [];
    }

    if (addon.registry.registry.js) {
      const js = [...addon.registry.registry.js].reverse();
      jsExtensions.push(...js.map(j => j.ext).flat().filter(x => !!x));
      const jsProcessors = [...js].reverse().map(j => {
        const plugin = j.toTree('./.', './.');
        if (plugin.extensions) {
          jsExtensions.push(...plugin.extensions);
        }
        if (plugin.processString) {
          Object.defineProperty(plugin, 'inputPaths', {
            value: [addon.name]
          });
          return plugin.processString.bind(plugin);
        }
      }).filter(x => !!x);

      addon.jsProcessors = jsProcessors;
    } else {
      addon.jsProcessors = [];
    }
  });
}

loadAddons(app.project.addons);


jsExtensions = [...new Set(jsExtensions), 'gjs', 'gts'];
const jsRegex = new RegExp(`.*\\.(${jsExtensions.join('|')})$`);

templateExtensions = [...new Set(templateExtensions)];
const templateRegex = new RegExp(`.*\\.(${templateExtensions.join('|')})$`);

console.log('templateRegex', templateRegex);
console.log('jsRegex', jsRegex);


export const allExtensions = [...new Set([...jsExtensions, ...templateExtensions].filter(x => !!x).map(x => `.${x}`))];
export default function classicProcessor(isProd) {
  return {
    name: 'classic-resolver',
    enforce: 'pre',
    async transform(src, id) {
      let localId = id;
      localId = localId.replace(app.project.root, '');
      let pkgName;
      if (localId.includes('node_modules')) {
        localId = localId.split('node_modules').slice(-1)[0];
        const parts = localId.split('/');
        pkgName = parts[1];
        let offset = 2;
        if (pkgName.startsWith('@')) {
          pkgName = parts.slice(1,3).join('/');
          offset = 3;
        }
        localId = parts.slice(offset).join('/');
      }

      let code = src;
      if (templateRegex.test(localId, localId)) {
        const addon = mapping[pkgName];
        const processors = addon?.templateProcessors || templateProcessors;
        code = await processors.reduce(async(prev, p) => await p(await prev, localId), code) || code;
        localId = localId + '.js';
      }
      if (jsRegex.test(localId, localId)) {
        if (!id.endsWith('.hbs')) {
          for (const ext of templateExtensions) {
            const path = id.replace(/\.(js|ts)$/, `.${ext}`);
            if (fs.existsSync(path)) {
              const prefix = `import { hbs } from 'ember-cli-htmlbars'; import __TEMPLATE__ from '${path}';const __COLOCATED_TEMPLATE__ = __TEMPLATE__;`;
              code = prefix + code;
              break;
            }
          }
        }
        const processors = mapping[pkgName]?.jsProcessors || jsProcessors;
        code = await processors.reduce(async(prev, p) => await p(await prev, localId), code) || code;
        return {
          code: code
        };
      }
    },
  };
}
