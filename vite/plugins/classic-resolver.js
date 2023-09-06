import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import { emberDeps, emberAddons, projectName, app as emberApp } from '../utils';

const rootDir = path.resolve('.');
const currentDir = path.dirname(import.meta.url.replace('file://', ''));
const compatDir = path.resolve(currentDir, '../compat/classic');

const init = path.join(compatDir, 'init.js');
const app = path.join(compatDir, 'app.js');
const contentFor = path.join(compatDir, 'content-for.js');
const addons = path.join(compatDir, 'addons.js');
const styles = path.join(compatDir, 'styles.js');
const config = path.join(rootDir, 'config/environment.js');
const glimmerOwner = path.join(rootDir, 'node_modules/@glimmer/component/addon/-private/owner.ts');
const loader = require.resolve('loader.js');



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

export default function hbsResolver() {
  return {
    name: 'classic-resolver',
    enforce: 'pre',
    transform(src, id) {
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
      if (id === contentFor) {
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
        })
        return {
          code: `const contentFor = ${JSON.stringify(contents)}` + fs.readFileSync(contentFor).toString().split('\n').slice(1).join('\n'),
          map: null
        };
      }
      if (id === glimmerOwner) {
        return {
          code: 'export { setOwner } from \'@ember/application\'',
          map: null
        };
      }
      if (id === config) {
        return {
          code: src.replace(/module.exports\s*=\s*/, 'export default '),
          map: null, // provide source map if available
        };
      }
      if (id === loader) {
        return {
          code: src + '\nexport default { require, define };',
          map: null, // provide source map if available
        };
      }
      let imports;
      if (id === init) {
        imports = glob.sync([
          'app/init/**/*.{js,ts}',
          'app/initializers/**/*.{js,ts}',
          'app/instance-initializers/**/*.{js,ts}'
        ]).map(r => r.replace(/\.(ts|js)$/, ''))
          .map(r => ({ name: r, import: `/${r}` }));
        for (const emberDep of emberDeps) {
          const root = path.join(rootDir, 'node_modules', emberDep);
          const addonFiles = glob.sync([
            'app/initializers/**/*.{js,ts}',
            'app/instance-initializers/**/*.{js,ts}'
          ], { cwd: root, ignore: ResolverConfig.ignoreAddonFiles[emberDep] })
            .map(r => r.replace(extRegex, ''))
            .map(r => ({ name: r, import: path.join(emberDep, r).replace('dist/_app_/', ''), addon: emberDep }));
          imports.push(...addonFiles);
        }
      }
      if (id === app) {
        const app = glob.sync([
          `app/**/*.{${extensions.join(',')}}`,
        ], {
          ignore: ['{app,addon}/init/**/*', '{app,addon}/initializers/**/*', '{app,addon}/instance-initializers/**/*']
        }).map(r => r.replace(/\.(ts|js|gts|gjs)$/, ''));
        imports = app.map(r => {
          return { name: r, import: `/${r}` };
        });
      }
      if (id === addons) {
        imports = [];
        for (const emberDep of emberDeps) {
          if (ResolverConfig.ignoreAddons.has(emberDep)) continue;
          const ignore = [...ResolverConfig.ignoreAddonFiles[emberDep] || []];
          ignore.push(...['**/*.d.ts', '**/*.js.map', 'app/{initializers,instance-initializers}/**/*', 'addon/{initializers,instance-initializers}/**/*']);
          const root = path.join(rootDir, 'node_modules', emberDep);
          const addonFiles = glob.sync([addonGlob, 'addon/index.{js,ts}'], { cwd: root, ignore })
            .map(r => r.replace(/\.(ts|js|gts|gjs)$/, ''))
            .map(r => ({ name: r, import: path.join(emberDep, r).replace('dist/_app_/', ''), addon: emberDep }));
          imports.push(...addonFiles);
        }
      }
      if (imports) {
        const imps = imports.map((r, i) => {
          return `import * as imp${i} from '${r.import}'`;
        });
        const defines = imports.map((r, i) => {
          if (r.name.endsWith('.hbs')) {
            const n = r.name.replace('.hbs', '');
            if (imports.find(x => x.name === n)) {
              return '';
            }
          }
          const name = r.name.replace('.hbs', '')
            .replace(/^app\//, `${projectName}/`)
            .replace(/^dist\/_app_\//, `${projectName}/`)
            .replace(/^addon\//, `${r.addon}/`);
          return `define('${name}', [], () => imp${i})`;
        });
        const code = imps.join(';\n') + '\n' + defines.join(';\n');
        return {
          code,
          map: null, // provide source map if available
        };
      }
    },
  };
}
