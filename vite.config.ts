import glob from 'fast-glob';
import { defineConfig } from 'vite';
import babel from 'vite-plugin-babel';
import { resolve } from 'node:path';
import classicProcessor from './vite/plugins/classic-processor';
import gtsResolver from './vite/plugins/gts-resolver';
import configResolver from './vite/plugins/classic-resolver';
import i18nLoader from './vite/plugins/i18n-loader';
import { generateDefineConfig } from './vite/compat/ember-data-private-build-infra';
import { coreAlias } from './vite/alias/core';
import { addonAliases, externals } from './vite/alias/addons';
import { appAlias } from './vite/alias/app';
import { emberAddons, emberDeps, app, projectName } from "./vite/utils";
import fs from 'node:fs';
import externalize from 'vite-plugin-externalize-dependencies';
import commonjs from 'vite-plugin-commonjs';
import path from 'path';
import pluginNodeResolve from '@rollup/plugin-node-resolve';


const allExtensions = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.hbs', '.gts', '.gjs'];

function isExternal(id: string) {
  return !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('~/');
}
const postcss_1 = require("postcss");
const postcss_scss_1 = require("postcss-scss");
const spark_md5_1 = require("spark-md5");
function generateScopedName(name, relativePath, namespace) {
  relativePath = relativePath.replace(/\\/g, '/');
  const prefix = relativePath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${(0, spark_md5_1.hash)(hashKey).slice(0, 5)}`;
}
const rewriterPlugin = ({ filename, deep, namespace }) => {
  return {
    postcssPlugin: 'postcss-importable',
    Once(css) {
      if (deep) {
        css.walkRules((rule) => {
          rule.selectors = rule.selectors.map((selector) => {
            const name = selector.slice(1);
            return `.${generateScopedName(name, filename, namespace)}`;
          });
        });
      }
      else {
        css.nodes.forEach((node) => {
          if (node.type === 'rule') {
            node.selectors = node.selectors.map((selector) => {
              const name = selector.slice(1);
              return `.${generateScopedName(name, filename, namespace)}`;
            });
          }
        });
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const isDev = mode === 'development';
  const enableSourceMaps = isDev;
  return {
    css: {
      preprocessorOptions: {
        scss: {
          alias: [],
          importer: [
            function(url, prev, done) {
              if (!url.endsWith('.scoped.scss')) return null;
              async function process() {
                const plugins = [];
                let namespace;
                if (url.includes('node_modules')) {
                  namespace = url.split('node_modules').slice(-1)[0];
                  if (namespace.startsWith('@')) {
                    namespace = namespace.split('/').slice(0, 2).join('/');
                  } else {
                    namespace = namespace.split('/')[0];
                  }
                } else {
                  namespace = projectName;
                }

                const relativePath = url.split('node_modules').slice(-1)[0].replace('/' + namespace + '/addon', '');
                plugins.push((0, rewriterPlugin)({
                  filename: relativePath,
                  namespace,
                  deep: false
                }));
                const content = await fs.promises.readFile(url);
                const result = await postcss_1(plugins).process(content, {
                  from: url,
                  to: url,
                  parser: postcss_scss_1.parse
                });
                done({
                  contents: result.css
                });
              }
              process();
            },
            function(url, prev) {
            if (url !== 'pod-styles') return null;
            const imports = glob.sync([
              'app/**/*.scoped.{scss,sass}',
            ]);
            const rootDir = path.resolve('.');
            for (const emberDep of emberDeps) {
              const root = path.join(rootDir, 'node_modules', emberDep);
              const addonFiles = glob.sync([
                'app/**/*.scoped.{scss,sass}',
              ], { cwd: root });
              imports.push(...addonFiles.map(f => path.join(root, f)));
            }
            return {
              contents: imports.map(i => `@import '${i}';`).join('\n'),
              syntax: 'scss'
            };
          }
            ,
            function(url) {
              if (url !== 'modules') return null;
              const imports = glob.sync([
                'app/**/*.module.{scss,sass}'
              ]);
              const rootDir = path.resolve('.');
              for (const emberDep of emberDeps) {
                const root = path.join(rootDir, 'node_modules', emberDep);
                const addonFiles = glob.sync([
                  'addon/**/*.module.{scss,sass}'
                ], { cwd: root });
                imports.push(...addonFiles.map(f => path.join(root, f)));
              }
              return {
                contents: imports.map(i => `@import '${i}';`).join('\n'),
                syntax: 'scss'
              };
            }
          ],
          includePaths: [
            process.cwd(),
            path.join(process.cwd(), 'node_modules'),
            ...emberAddons.map(a => fs.existsSync(path.join(a.root, 'app', 'styles')) && path.join(a.root, 'app', 'styles')).filter(x => !!x),
            ...emberAddons.map(a => fs.existsSync(path.join(a.root, 'addon', 'styles')) && path.join(a.root, 'addon', 'styles')).filter(x => !!x)
          ]
        }
      }
    },
    optimizeDeps: {
      disabled: true,
      entries: ['loader.js'],
      esbuildOptions: {
        resolveExtensions: allExtensions,
        plugins: [
          {
            name: 'classic',
            setup(build) {
              const namespace = '';
              const filter = new RegExp('.*\\.(hbs|js|ts)$');
              build.onLoad({ filter, namespace }, async(args) => {
                const contents = await fs.promises.readFile(args.path, 'utf8');
                const res = await classicProcessor().transform(contents, args.path);
                return {
                  contents: res.code
                };
              });
            }
          }
        ]
      },
      extensions: allExtensions,
      include: ['is-mobile', 'loader.js']
      // exclude: ['@ember-data']
      // exclude: emberDeps,
    },
    treeshake: {
      correctVarValueBeforeDeclaration: false,
      moduleSideEffects: false,
      preset: 'smallest',
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/]
      },
      sourcemap: enableSourceMaps,
      rollupOptions: isDev
        ? {
          external: isExternal,
          // external: externals,
          input: {
            main: resolve(__dirname, 'app/ui/index.html'),
            nested: resolve(__dirname, 'tests/index.html')
          }
        }
        : {
          output: {
            manualChunks(id) {
              if (
                id.includes('/compat/') ||
                id.includes('@ember/') ||
                id.includes('/rsvp/') ||
                id.includes('/router_js/') ||
                id.includes('dag-map') ||
                id.includes('route-recognizer') ||
                id.includes('tracked-built-ins') ||
                id.includes('tracked-toolbox') ||
                id.includes('@ember-data/') ||
                id.includes('embroider-macros') ||
                id.includes('/backburner.js/') ||
                id.includes('@glimmer') ||
                id.includes('ember-inflector') ||
                id.includes('ember-source')
              ) {
                // chunk for ember runtime
                return 'core';
              }
              if (id.endsWith('/app/addons/index.ts')) {
                // initial addons and application chunk
                return 'app';
              }
              return undefined;
            }
          }
        }
    },
    server: {
      port: 4200
    },
    preview: {
      port: 4200
    },
    define: {
      ENV_DEBUG: isProd ? false : true,
      ENV_CI: false,
      ...generateDefineConfig(isProd)
    },
    resolve: {
      extensions: allExtensions,
      get alias() {
        if (!globalThis.aliasReturned) {
          globalThis.aliasReturned = true;
          return [
            ...coreAlias,
            ...addonAliases,
            ...appAlias
          ]
        } else {
          return []
        }
      },
    },
    plugins: [
      externalize({ externals: externals }),
      commonjs({
        filter(id) {
          // `node_modules` is exclude by default, so we need to include it explicitly
          // https://github.com/vite-plugin/vite-plugin-commonjs/blob/v0.7.0/src/index.ts#L125-L127
          if (emberDeps.every(cjs => !id.includes(`node_modules/${cjs}`))) {
            return true;
          }
        }
      }),
      gtsResolver(isProd),
      configResolver(),
      classicProcessor(),
      i18nLoader(),
      !isDev
        ? babel({
          filter: /^.*@(ember|glimmer|ember-data)\/.*\.(ts|js|hbs)$/,
          babelConfig: {
            babelrc: false,
            configFile: false,
            plugins: [
              [
                'babel-plugin-unassert',
                {
                  variables: [
                    'assert',
                    'info',
                    'warn',
                    'debug',
                    'deprecate',
                    'debugSeal',
                    'debugFreeze',
                    'runInDebug'
                  ],
                  modules: ['@ember/debug']
                }
              ],
              [
                '@babel/plugin-proposal-decorators',
                {
                  version: 'legacy'
                }
              ],
              ['@babel/plugin-proposal-class-properties', { loose: true }]
            ],
            presets: ['@babel/preset-typescript']
          }
        })
        : null
      // ...
    ].filter((el) => el !== null)

    // ...
  };
});
