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
import { emberAddons, emberDeps, app, scssImporters } from './vite/utils';
import fs from 'node:fs';
import externalize from 'vite-plugin-externalize-dependencies';
import commonjs from 'vite-plugin-commonjs';
import path from 'path';
import { pathsImporter } from './vite/plugins/scss-utils';
import './vite/setup'


const allExtensions = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.hbs', '.gts', '.gjs'];
console.log(emberDeps);
function isExternal(id: string) {
  return !id.startsWith('.') && !path.isAbsolute(id) && !id.startsWith('~/');
}

const cssIncludePaths = [
  process.cwd(),
  path.join(process.cwd(), 'node_modules'),
  ...emberAddons.map(a => fs.existsSync(path.join(a.root, 'app', 'styles')) && path.join(a.root, 'app', 'styles')).filter(x => !!x),
  ...emberAddons.map(a => fs.existsSync(path.join(a.root, 'addon', 'styles')) && path.join(a.root, 'addon', 'styles')).filter(x => !!x)
];

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const isDev = mode === 'development';
  const enableSourceMaps = isDev;
  return {
    test: {
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright'
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          alias: [],
          importer: [pathsImporter(cssIncludePaths)].concat(scssImporters),
          includePaths: cssIncludePaths
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
          // external: isExternal,
          // external: externals,
          input: {
            main: resolve(__dirname, 'index.html'),
            nested: resolve(__dirname, 'index.tests.html')
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
      alias: [
        ...coreAlias,
        ...addonAliases,
        ...appAlias
      ]
    },
    plugins: [
      externalize({ externals: externals }),
      commonjs({
        filter(id) {
          console.log('id', id)
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
