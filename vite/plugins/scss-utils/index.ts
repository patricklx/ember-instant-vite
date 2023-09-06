import sparkMd5 from 'spark-md5';
import fs from 'fs';
import path from 'path';

export function generateScopedName(name, relativePath, namespace) {
  relativePath = relativePath.replace(/\\/g, '/');
  const prefix = relativePath.split('/').slice(-2)[0];
  const hashKey = `${namespace}_${prefix}_${name}`;
  return `${namespace}_${prefix}_${name}_${(0, sparkMd5.hash)(hashKey).slice(0, 5)}`;
}
export const rewriterPlugin = ({ filename, deep, namespace }) => {
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


export const pathsImporter = (paths) => {
  async function search(url) {
    if (fs.existsSync(url)) {
      return null;
    }
    for (const p of paths) {
      let newPath = path.join(p, url);
      if (!newPath.endsWith('.scss') && !newPath.endsWith('.sass') && !newPath.endsWith('.css')) {
        newPath += '.scss';
      }
      if (fs.existsSync(newPath)) {
        console.log('found path', newPath);
        return {
          file: newPath
        };
      }
    }
    return null
  }
  return (url, prev, done) => {
    search(url).then(done).catch(e => done(null));
  };
};
