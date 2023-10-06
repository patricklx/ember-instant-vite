import { app, isAddon, relativePath, rootPath } from '../utils';
import * as parallelBabel from 'broccoli-babel-transpiler/lib/parallel-api';
import fs from 'node:fs';
import jsStringEscape from 'js-string-escape';

app.options['ember-cli-babel'] = app.options['ember-cli-babel'] || {};
app.options['ember-cli-babel'].compileModules = false;
app.options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;

const mapping = {};

function loadAddons(addons) {
  addons.forEach((addon) => {
    let root = addon.packageRoot;
    mapping[root] = addon;
    loadAddons(addon.addons || []);
  });
}

loadAddons([app.project]);


const jsExtensions = ['js', 'ts', 'gjs', 'gts'];
const jsRegex = new RegExp(`.*\\.(${jsExtensions.join('|')})$`);

const templateExtensions = ['hbs', 'handlebars'];
const templateRegex = new RegExp(`.*\\.(${templateExtensions.join('|')})$`);

const projectName = typeof app.project.name === 'string' ? app.project.name : app.project.name();
const mainApp = isAddon ? app.project.addons.find(a => a.name === projectName) : app.project;

const isPnpm = fs.existsSync('node_modules/.pnpm');
function tpl(raw, id, isProd) {
  id = relativePath(id);
  let optsSource = '';
  optsSource = `,{ moduleName: "${jsStringEscape(id)}" }`;
  return [
    'import { precompileTemplate } from "@ember/template-compilation";',
    `export default precompileTemplate("${jsStringEscape(raw)}"${optsSource})`,
  ].join('\n');
}

export default function classicProcessor(isProd) {
  return {
    name: 'classic-processor',
    enforce: 'pre',
    async transform(src, id) {
      if (id.includes('\u0000')) {
        return null;
      }
      if (id.endsWith('.json')) {
        return null;
      }
      id = id.replaceAll('\\', '/')
      let localId = relativePath(id)
      let root = rootPath(id);
      if (isPnpm && (!root.includes('/.pnpm/') || (fs.existsSync(root) && fs.lstatSync(root).isSymbolicLink()))) {
        root = await fs.promises.realpath(root);
        root = root.replaceAll('\\', '/');
      }

      let code = src;
      if (templateRegex.test(localId, localId)) {
        const addon = mapping[root] || mainApp;
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
          code = tpl(code, id);
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
        const addon = (id.includes('/_app_/') || id.includes('/app/')) ? mainApp : (mapping[root] || mainApp);
        let result = addon.emberBabelOptions && await parallelBabel.transformString(code, {
          babel: {
            plugins: addon.emberBabelOptions.plugins.slice(),
            presets: addon.emberBabelOptions.presets,
            filename: localId
          }
        }) || { code };
        if (!addon.emberBabelOptions || addon.pkg['ember-addon'].version === 2) {
          async function withRetries() {
            try {
              result = await parallelBabel.transformString(result.code, {
                babel: {
                  plugins: mainApp.emberBabelOptions.plugins.slice(),
                  presets: mainApp.emberBabelOptions.presets,
                  filename: localId
                }
              });
            } catch (e) {
              if (e.code === 'EMFILE') {
                await withRetries();
                return
              }
              throw e;
            }
          }
          await withRetries();
        }

        return {
          code: result.code
        };
      }
    },
  };
}
