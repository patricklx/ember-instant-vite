import classicProcessor from './plugins/classic-processor';
import emberResolver from './plugins/ember-resolver';
import gtsResolver from './plugins/gts-resolver';
import i18nLoader from './plugins/i18n-loader';
import { emberCodeSnippet } from './plugins/ember-code-snippet';
import { emberCliAddonDocs } from './plugins/ember-cli-addon-docs';
import classicResolver from './plugins/classic-resolver';
import commonjs from '@rollup/plugin-commonjs';
import * as b from '@babel/core';
import * as t from '@babel/types';
import fs from 'node:fs';
import { emberAddons } from './utils'

const emberDeps = emberAddons.filter(e => e.packageRoot.includes('/node_modules/'));
const commonjsExclude = [/\x00/, /\.json$/].concat(emberDeps.map(e => new RegExp(`/${e.name}/`)));

const commonPlugin = commonjs({
  transformMixedEsModules: true,
  exclude: commonjsExclude,
  requireReturnsDefault: 'preferred',
  ignore(id) {
    return id.includes('.json')
  }
});

const classicProcessorPlugin = classicProcessor();

const namedImportsFix = {
    name: 'named-imports',
    enforce: 'post',
    async resolveId(importee, importer, resolveOptions) {
      return this.resolve(importee, importer, resolveOptions);
    },

    async transform(src: string, id: string, options) {
      if (id.includes('\u0000')) {
        return null;
      }
      if (!id.endsWith('.js') && !id.endsWith('.ts')) {
        return null;
      }
      const namedImports = {};
      const pluginCtx = this;
      const addedImports = [];
      const plugin = {
        name: 'transform imports',
        visitor: {
          Program: {
            exit(path: b.NodePath<t.Program>) {
              path.node.body.splice(0, 0, ...addedImports);
            }
          },
          CallExpression(path: b.NodePath<t.CallExpression>) {
            if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'require' && path.node.arguments[0].type === 'StringLiteral') {
              if (path.node.arguments[0].value.endsWith('.json')) {
                const uid = path.scope.generateUidIdentifier('imp');
                addedImports.push(
                  t.importDeclaration([
                    t.importNamespaceSpecifier(uid)
                  ], path.node.arguments[0] as t.StringLiteral)
                );
                path.replaceWith(uid);
                return
              }
            }
            if (path.node.callee.type === 'Identifier' && path.node.callee.name === 'require') {
              if (path.parent.type === 'CallExpression'
                && path.parent.callee.type === 'Identifier'
                && path.parent.callee.name === 'esc'
                && path.node.arguments[0].type === 'StringLiteral') {
                const uid = path.scope.generateUidIdentifier('imp');
                addedImports.push(
                  t.importDeclaration([
                    t.importNamespaceSpecifier(uid)
                  ], path.node.arguments[0] as t.StringLiteral)
                );
                path.replaceWith(uid);
              }
            }
          },
          ImportDeclaration(path: b.NodePath<t.ImportDeclaration>) {
            const node = path.node as t.ImportDeclaration;
            const moduleInfo = namedImports[node.source.value];
            if (moduleInfo?.syntheticNamedExports) {
              const namedImports = node.specifiers.filter(s => s.type === 'ImportSpecifier') as t.ImportSpecifier[];
              if (!namedImports.length) {
                return
              }
              const uid = path.scope.generateUidIdentifier('namedImports');
              node.specifiers.length = 0;
              node.specifiers.push(
                t.importSpecifier(uid, t.identifier(moduleInfo.syntheticNamedExports))
              );
              path.replaceWithMultiple([
                path.node,
                t.variableDeclaration('const', [t.variableDeclarator(t.objectPattern(
                  namedImports.map(n => t.objectProperty(t.identifier(n.local.name), t.identifier(n.imported.name || n.imported.value)))
                ), uid)])
              ])
            }
          }
        }
      };

      b.transform(src, {
        filename: id,
        plugins: [{
          visitor: {
            ImportDeclaration(path: b.NodePath<t.ImportDeclaration>) {
              const node = path.node as t.ImportDeclaration;
              namedImports[node.source.value] = null;
            }
          }
        }],
      });
      for (const key of Object.keys(namedImports)) {
        const resolved = await pluginCtx.resolve(key, id);
        if (!resolved) continue
        if (resolved.id.includes('\u0000')) continue
        if (!resolved.id.endsWith('.js')) continue
        if (commonjsExclude.some(re => re.test(resolved.id))) {
          continue
        }
        const code = (await fs.promises.readFile(resolved.id)).toString();
        await pluginCtx.load(resolved);
        const processed = await classicProcessorPlugin.transform.call(this, code, resolved.id, options)
        const moduleInfo = await commonPlugin.transform.call(this, processed?.code, resolved.id, options);
        namedImports[key] = moduleInfo;
      }
      const r = await b.transform(src, {
        filename: id,
        sourceMaps: 'inline',
        plugins: [plugin]
      });
      return {
        code: r.code,
        map: r.map
      };
    }
};

export const emberPlugins = (mode) => [
  emberCodeSnippet(),
  emberCliAddonDocs(),
  emberResolver(mode),
  classicResolver(mode),
  gtsResolver(mode),
  classicProcessorPlugin,
  i18nLoader(),
  commonPlugin,
  namedImportsFix
];
