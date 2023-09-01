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
import { emberDeps } from './vite/utils';
import fs from 'node:fs';
import externalize from 'vite-plugin-externalize-dependencies';
import commonjs from 'vite-plugin-commonjs';

const commonjsPkgs = ['blueimp-md5', 'is-mobile', 'lodash', 'seedrandom'];
const allExtensions = ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.hbs', '.gts', '.gjs'];

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const isDev = mode === 'development';
  const enableSourceMaps = isDev;
  return {
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
              const filter = new RegExp(`(${emberDeps.join('|')}).*\\.(hbs|js|ts)$`);
              build.onLoad({ filter, namespace }, async(args) => {
                const contents = await fs.promises.readFile(args.path, 'utf8');
                if (args.path.includes('task-properties')) {
                  console.log('contents', contents);
                }
                const res = await classicProcessor().transform(contents, args.path);
                if (args.path.includes('ember-concurrency')) {
                  console.log('converted', res.code);
                }
                return {
                  contents: res.code,
                  loader: 'js'
                };
              });
            }
          },
        ],
      },
      extensions: allExtensions,
      include: ['is-mobile', 'loader.js'],
      exclude: emberDeps,
    },
    treeshake: {
      correctVarValueBeforeDeclaration: false,
      moduleSideEffects: false,
      preset: 'smallest',
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false,
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/]
      },
      sourcemap: enableSourceMaps,
      rollupOptions: isDev
        ? {
          // external: externals,
          input: {
            main: resolve(__dirname, 'app/ui/index.html'),
            nested: resolve(__dirname, 'tests/index.html'),
          },
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
            },
          },
        },
    },
    server: {
      port: 4200,
    },
    preview: {
      port: 4200,
    },
    define: {
      ENV_DEBUG: isProd ? false : true,
      ENV_CI: false,
      ...generateDefineConfig(isProd),
    },
    resolve: {
      extensions: allExtensions,
      alias: [
        ...coreAlias,
        ...addonAliases,
        ...appAlias,
      ],
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
                    'runInDebug',
                  ],
                  modules: ['@ember/debug'],
                },
              ],
              [
                '@babel/plugin-proposal-decorators',
                {
                  version: 'legacy',
                },
              ],
              ['@babel/plugin-proposal-class-properties', { loose: true }],
            ],
            presets: ['@babel/preset-typescript'],
          },
        })
        : null,
  // ...
].filter((el) => el !== null),

  // ...
};
});
