import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import {
  emberDeps,
  emberAddons,
  projectName,
  app as emberApp,
  getIsTesting,
  hasCacheFor,
  loadFromCacheAsync, saveToCache
} from '../utils';

const rootDir = path.resolve('.').replaceAll('\\', '/');
const currentDir = path.dirname(import.meta.url.replace('file:///', '')).replaceAll('\\', '/');
const compatDir = path.resolve(currentDir, '../compat/classic').replaceAll('\\', '/');
const cacheDir = path.resolve(currentDir, '../.cache').replaceAll('\\', '/');

const init = path.join(compatDir, 'init.js').replaceAll('\\', '/');
const app = path.join(compatDir, 'app.js').replaceAll('\\', '/');
const contentFor = path.join(compatDir, 'content-for.js').replaceAll('\\', '/');
const addons = path.join(compatDir, 'addons.js').replaceAll('\\', '/');
const styles = path.join(compatDir, 'styles.js').replaceAll('\\', '/');
const dummy = path.join(compatDir, 'dummy.js').replaceAll('\\', '/');
let config = path.join(rootDir, 'config/environment.js').replaceAll('\\', '/');
const glimmerOwner = path.join(rootDir, 'node_modules/@glimmer/component/addon/-private/owner.ts').replaceAll('\\', '/');
const loader = require.resolve('loader.js').replaceAll('\\', '/');

const isAddon = fs.existsSync('addon');

if (isAddon) {
  config = path.join(rootDir, 'tests/dummy/config/environment.js').replaceAll('\\', '/');
}

const ResolverConfig = {
  resolveDirs: [
    'ui/components', // mu layout
    'ui/helpers',
    'ui/modifiers',
    'ui/routes',
    'init',
    'data', // mu layout end
    'initializers',
    'instance-initializers',
    'models',
    'transforms',
    'adapters',
    'serializer',
    'services',
    'routes',
    'helpers',
    'modifiers',
    'components',
  ],
  ignoreAddonFiles: {
    '@abcum/ember-helpers': [
      'app/initializers/**/*',
      'app/instance-initializers/**/*',
      'app/helpers/**/*',
      'addon/helpers/invoke.js'
    ],
    'ember-css-modules': [
      'addon/index.js',
      'addon/initializers/**/*',
      'addon/instance-initializers/**/*',
    ],
    'ember-composable-helpers': [
      'addon/index.js',
    ]
  },
  ignoreAddons: new Set(['ember-fetch'])
};

const extensions = ['js','ts','hbs','handlebars','gts','gjs'];
const extRegex = new RegExp(`\\.(${extensions.join('|')})$`);

const addonGlob = `{app,addon,dist/_app_}/{${ResolverConfig.resolveDirs.join(',')}}/**/*.{${extensions.join(',')}}`;

const isTesting = getIsTesting();

const appName = (isAddon || isTesting) ? 'dummy' : projectName;
const appRoot = (isAddon || isTesting) ? 'tests/dummy/app' : 'app';
const testingAddon = {
  name: projectName,
  app: `/app/**/*.{${extensions.join(',')}}`,
  addon: `/addon/**/*.{${extensions.join(',')}}`
}

export default function classicResolver(mode) {
  return {
    name: 'classic-resolver',
    enforce: 'pre',
    async load(id) {
      if (id === styles) {
        let code = '';
        let st = path.join(rootDir, 'app', 'styles', 'app.css');
        if (fs.existsSync(st)) {
          code += `import "${st}"\n`;
        }
        st = path.join(rootDir, 'app', 'styles', 'app.scss');
        if (fs.existsSync(st)) {
          code += `import "${st}"\n`;
        }
        st = path.join(rootDir, 'app', 'ui', 'styles', 'app.css');
        if (fs.existsSync(st)) {
          code += `import "${st}"\n`;
        }
        st = path.join(rootDir, 'app', 'ui', 'styles', 'app.scss');
        if (fs.existsSync(st)) {
          code += `import "${st}"\n`;
        }
        return {
          code,
          map: null
        };
      }
      if (id === dummy) {
        return {
          code: `globalThis.isDummy = ${isAddon}`,
          map: null
        };
      }
      let code = '';
      const cacheFile = id.split('/').slice(-1)[0];


      if (id === contentFor) {
        if (hasCacheFor(cacheFile)) {
          return {
            code: await loadFromCacheAsync(cacheFile)
          };
        }
        const placeHolders = ['head', 'head-footer', 'body', 'body-footer'];
        const contents = {};
        emberAddons.forEach(a => {
          for (const placeHolder of placeHolders) {
            contents[placeHolder] = contents[placeHolder] || '';
            const c = a.contentFor?.(placeHolder, emberApp.project.config());
            if (c) {
              contents[placeHolder] += '\n';
              contents[placeHolder] += c;
            }
          }
        });
        const code = `const contentFor = ${JSON.stringify(contents)}` + fs.readFileSync(contentFor).toString().split('\n').slice(1).join('\n');
        await saveToCache(cacheFile, code)
        return {
          code: code,
          map: null
        };
      }
      if (id === glimmerOwner) {
        return {
          code: 'export { setOwner } from \'@ember/application\'',
          map: null
        };
      }

      let imports;
      if (id === init) {
        if (hasCacheFor(cacheFile)) {
          const code = (await loadFromCacheAsync(cacheFile)).toString();
          return {
            code
          };
        }
        code += `const appModules = import.meta.glob([
        '../../${appRoot}/init/**/*.{js,ts}',
        '../../${appRoot}/initializers/**/*.{js,ts}',
        '../../${appRoot}/instance-initializers/**/*.{js,ts}'
        ], { eager: true });
        Object.entries(appModules).forEach(([name, imp]) => define(name.replace('/${appRoot}/', '${appName}/').split('.').slice(0, -1).join('/'), [], () => imp));
        `
        imports = [];
        for (const emberAddon of emberAddons) {
          const root = emberAddon.packageRoot;
          const name = emberAddon.pkg.name;
          const addonFiles = glob.sync([
            '{app,_app_}/initializers/**/*.{js,ts}',
            '{app,_app_}/instance-initializers/**/*.{js,ts}'
          ], { cwd: root, ignore: ResolverConfig.ignoreAddonFiles[name] })
              .map(r => r.replace(extRegex, ''))
              .map(r => r.replaceAll('\\', '/'))
              .map(r => ({ name: r, import: path.join(root, r), addon: name }));
          imports.push(...addonFiles);
        }
      }
      if (id === app) {
        code += `const appModules = import.meta.glob([
        '/${appRoot}/**/*.{${extensions.join(',')}}',
        '/${appRoot}/router.{${extensions.join(',')}}',
        '!/${appRoot}/init/**/*',
        '!/${appRoot}/initializers/**/*',
        '!/${appRoot}/instance-initializers/**/*',
        ], { eager: true });
        Object.entries(appModules).forEach(([name, imp]) => define(name.replace('/${appRoot}/', '${appName}/').split('.').slice(0, -1).join('/'), [], () => imp));
        `
        if (isAddon) {
          code += `const addonAppModules = import.meta.glob([
        '${testingAddon.app}',
        ], { eager: true });
        Object.entries(addonAppModules).forEach(([name, imp]) => define(name.replace('/app/', '${appName}/').split('.').slice(0, -1).join('/'), [], () => imp));
        `;
          code += `const addonModules = import.meta.glob([
        '${testingAddon.addon}',
        ], { eager: true });
        Object.entries(addonModules).forEach(([name, imp]) => define(name.replace('/addon/', '${testingAddon.name}/').split('.').slice(0, -1).join('/'), [], () => imp));
        `;
        }
        imports = [];
      }
      if (id === addons) {
        if (hasCacheFor(cacheFile)) {
          const code =  await loadFromCacheAsync(cacheFile);
          return {
            code: code.toString()
          };
        }
        imports = [];
        const processed = new Set();
        for (const emberAddon of emberAddons) {
          const name = emberAddon.pkg.name;
          const root = emberAddon.packageRoot;
          if (processed.has(root)) continue;
          processed.add(root);
          if (ResolverConfig.ignoreAddons.has(name)) continue;
          if (name === projectName) continue;
          const ignore = [...ResolverConfig.ignoreAddonFiles[name] || []];
          ignore.push(...['**/*.d.ts', '**/*.js.map', '{app,_app_}/{initializers,instance-initializers}/**/*', 'addon/{initializers,instance-initializers}/**/*']);
          const addonFiles = glob.sync([addonGlob, 'addon/index.{js,ts}'], { cwd: root, ignore })
              .map(r => r.replace(/\.(ts|js|gts|gjs)$/, ''))
              .map(r => r.replaceAll('\\', '/'))
              .map(r => ({ name: r, import: path.join(root, r).replaceAll('\\', '/'), addon: name }));
          imports.push(...addonFiles);
        }
      }
      if (imports) {
        const imps = imports.map((r, i) => {
          return `import * as imp${i} from '${r.import.replaceAll('\\', '/')}'`;
        });
        const defines = imports.map((r, i) => {
          if (r.name.endsWith('.hbs')) {
            const n = r.name.replace('.hbs', '');
            if (imports.find(x => x.name === n)) {
              return '';
            }
          }
          const name = r.name.replace('.hbs', '')
              .replace(/^app\//, `${appName}/`)
              .replace(/^dist\/_app_\//, `${appName}/`)
              .replace(/^addon\//, `${r.addon}/`);
          return `define('${name}', [], () => imp${i})`;
        });
        code += imps.join(';\n') + '\n' + defines.join(';\n');
        if (id === app) {
          code += `\nexport default globalThis.require('${appName}/app').default`;
        }
        if (id === init || id === addons) {
          await saveToCache(cacheFile, code)
        }
        return {
          code,
          map: null, // provide source map if available
        };
      }
      return null;
    },
    async transform(src, id) {
      if (id.includes('\u0000')) {
        return null;
      }
      if (id.includes('.json')) {
        return null;
      }
      id = id.replaceAll('\\', '/');
      if (id === config) {
        let contents = require(config)(mode);
        if (hasCacheFor('environment.js')) {
          return {
            code: await loadFromCacheAsync('environment.js')
          };
        }

        emberAddons.forEach(a => {
          contents = a.config?.(mode, contents) || contents;
        })

        const code = `export default ${JSON.stringify(contents, null, 2)};`
        await saveToCache('environment.js', code);
        return {
          code: code,
          map: null, // provide source map if available
        };
      }

      if (id.includes('loader.js')) {
        id = await fs.promises.realpath(id);
        id = id.replaceAll('\\', '/');
      }

      if (id === loader) {
        return {
          code: src + '\nexport default { require, define };',
          map: null, // provide source map if available
        };
      }
      return null;
    }
  };
}
