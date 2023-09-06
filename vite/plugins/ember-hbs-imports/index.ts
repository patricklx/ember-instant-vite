import { emberDeps, projectName } from '../../utils';
import fs from 'node:fs';
import postcss_1 from 'postcss';
import postcss_scss_1 from 'postcss-scss';
import glob from 'fast-glob';
import path from 'path';
import { rewriterPlugin } from '../scss-utils';

export const scssImporter = [
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
];
