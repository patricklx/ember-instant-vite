import { app } from '../utils';
import config from '../babel/config';
import * as parallelBabel from 'broccoli-babel-transpiler/lib/parallel-api';
import fs from 'node:fs';
import path from 'path';

app.options['ember-cli-babel'] = app.options['ember-cli-babel'] || {};
app.options['ember-cli-babel'].compileModules = false;
app.options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;

const appJs = [...app.registry.registry.js].reverse();
let jsExtensions = appJs.map(j => j.ext).flat().filter(x => !!x);
const jsProcessors = [...appJs].reverse().map(j => {
  try {
    const plugin = j.toTree('./.', './.');
    if (plugin.extensions) {
      jsExtensions.push(...plugin.extensions);
    }
    return plugin.processString?.bind(plugin);
  } catch (e) {
    // nope
  }
}).filter(x => !!x);


const template = [...app.registry.registry.template].reverse();
let templateExtensions = template.map(j => j.ext).flat().filter(x => !!x);
const templateProcessors = [...template].reverse().map(j => {
  try {
    const plugin = j.toTree('./.', './.');
    if (plugin.extensions) {
      templateExtensions.push(...plugin.extensions);
    }
    return plugin.processString?.bind(plugin);
  } catch (e) {}
}).filter(x => !!x);

const mapping = {};

function loadAddons(addons) {
  addons.forEach((addon) => {
    if (mapping[addon.name] && mapping[addon.name] !== addon) {
      if (addon.options?.babel?.plugins) {
        for (const p of addon.options.babel.plugins) {
          const has = mapping[addon.name].options.babel.plugins.find(x => x[0] === p[0]);
          if (!has) {
            mapping[addon.name].options.babel.plugins.push(p);
          }
        }
      }
    } else {
      mapping[addon.name] = addon;
    }
    // mapping[addon.name] = addon;
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
        try {
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
        } catch (e) {}
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

const babelAddon = require('ember-cli-babel');

export const allExtensions = [...new Set([...jsExtensions, ...templateExtensions].filter(x => !!x).map(x => `.${x}`))];
export default function classicProcessor(isProd) {
  return {
    name: 'classic-resolver',
    enforce: 'pre',
    async transform(src, id) {
      let localId = id;
      localId = localId.replace(app.project.root + '/app/', '');
      localId = localId.replace(app.project.root + '/addon/', '');
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
        localId = localId.replace(/^addon\//, `${pkgName}/`);
      }

      let code = src;
      if (templateRegex.test(localId, localId)) {
        const addon = mapping[pkgName] || app.project;
        const htmlBars = addon.addons.find(a => a.name === 'ember-cli-htmlbars');
        if (id.endsWith('.hbs') && !id.endsWith('template.hbs') && htmlBars?.pkg.version.split('.')[0] >= 4) {
          const hasBackingClass = jsExtensions.find(ext => fs.existsSync(id.replace(/\..*$/, `.${ext}`)));
          if (!hasBackingClass) {
            const templateContents = src;
            const hbsInvocationOptions = {
              contents: templateContents,
              moduleName: localId,
              parseOptions: {
                srcName: localId,
              },
            };
            const hbsInvocation = `hbs(${JSON.stringify(templateContents)}, ${JSON.stringify(
              hbsInvocationOptions
            )})`;
            const jsContent = '' +
              'import { hbs } from \'ember-cli-htmlbars\'; ' +
              'import templateOnly from \'@ember/component/template-only\';' +
              `const __COLOCATED_TEMPLATE__ = ${hbsInvocation};` +
              'export default templateOnly();';
            code = jsContent;
            localId = localId + '.js';
          }
        }
        if (!localId.endsWith('.js')) {
          const processors = addon?.templateProcessors || templateProcessors;
          code = await processors.reduce(async(prev, p) => await p(await prev, localId), code) || code;
          localId = localId + '.js';
        }
      }
      if (jsRegex.test(localId, localId)) {
        if (!id.endsWith('.hbs')) {
          for (const ext of templateExtensions) {
            const path = id.replace(/\..*$/, `.${ext}`);
            if (fs.existsSync(path)) {
              const prefix = `import { hbs } from 'ember-cli-htmlbars'; import __TEMPLATE__ from '${path}';const __COLOCATED_TEMPLATE__ = __TEMPLATE__;`;
              code = prefix + code;
              break;
            }
          }
        }
        const addon = (id.includes('/_app_/') || id.includes('/app/')) ? (mapping[pkgName] || app) : app;
        const babelPlugins = addon.options.babel.plugins || [];
        const plugins = babelAddon.buildEmberPlugins(addon.project?.root || addon.root);

        const isS = (p) => Array.isArray(p);

        const allPlugins = [['@babel/plugin-transform-typescript', { allowDeclareFields: true }]].concat(plugins).concat(babelPlugins)
          .filter(b => !b[0] || b[0] && !b[0].includes('plugin-transform-modules-amd'))
          .filter(b => !b[0] || b[0] && !b[0].includes('babel-plugin-module-resolver'));

        let all = allPlugins
          .map(p => isS(p) ? p : [p]);

        const set = new Set();
        all = [];
        allPlugins.forEach((p, i) => {
          if (typeof p[0] === 'string' && p[0].length > 1) {
            const resolved = require.resolve(p[0]);
            if (set.has(resolved)) {
              return;
            }
            set.add(resolved);
          }
          all.push(p);
        });

        const result = await parallelBabel.transformString(code, {
          babel: {
            filename: localId,
            plugins: all
          }
        });
        return result;
      }
    },
  };
}
