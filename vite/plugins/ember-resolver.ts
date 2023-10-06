import { promisify } from 'util';
import nodeResolve from 'resolve';
import fs from 'fs';
import { allExtensions, rootPath } from '../utils';

const { dirname } = require('node:path');


const asyncNodeResolve = promisify(nodeResolve);

async function tryFind(importee, importer, resolveOptions) {
  try {
    const parts = importee.split('/');
    if (!parts.includes('addon')) {
      if (parts[0].startsWith('@')) {
        parts.splice(2, 0, 'addon');
      } else {
        parts.splice(1, 0, 'addon');
      }
    }
    const id = parts.join('/')

    return await asyncNodeResolve(id, { basedir: dirname(importer), extensions: allExtensions })
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }

  let root = '';
  try {
    let rootPkg = importee.split('/node_modules/').slice(-1)[0];
    if (rootPkg.startsWith('@')) {
      rootPkg = rootPkg.split('/').slice(0, 2).join('/');
    } else {
      rootPkg = rootPkg.split('/').slice(0, 1).join('/');
    }
    root = dirname(await asyncNodeResolve(rootPkg, {
      basedir: dirname(importer),
      extensions: allExtensions,
      packageFilter: (pkg) => ({ ...pkg, main: pkg.module || pkg.main })
    }));
    root = root.replaceAll('\\', '/');
    root = root.replace(rootPath(root), '');
    if (root.startsWith('/')) {
      root = root.slice(1);
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  try {
    const parts = importee.split('/');
    if (parts[0].startsWith('@')) {
      parts.splice(2, 0, 'addon');
      if (root) parts.splice(2, 0, root);
    } else {
      parts.splice(1, 0, 'addon');
      if (root) parts.splice(2, 0, root);
    }
    const id = parts.join('/')
    if (id.includes('@glimmer/macros')) {
    }
    return await asyncNodeResolve(id, { basedir: dirname(importer), extensions: allExtensions })
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  try {
    const parts = importee.split('/');
    if (parts[0].startsWith('@')) {
      parts.splice(2, 0, 'dist');
    } else {
      parts.splice(1, 0, 'dist');
    }
    const id = parts.join('/')
    return await asyncNodeResolve(id, { basedir: dirname(importer), extensions: allExtensions })
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  try {
    return await asyncNodeResolve(importee, {
      basedir: dirname(importer),
      extensions: allExtensions,
      packageFilter: (pkg) => ({ ...pkg, main: pkg.module || pkg.main })
    })
  } catch (e) {
  }
  try {
    const r = await this.resolve(importee, importer, { skipSelf: true, ...resolveOptions, extensions: allExtensions  });
    if (r !== null) {
      return r;
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  try {
    const realImporter = await fs.promises.realpath(importer);
    if (realImporter !== importer) {
      return await this.resolve(importee, realImporter, resolveOptions);
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  return null;
}

function emberResolver(isProd) {
    return {
        name: 'ember-resolver',
        enforce: 'pre',
        resolveId: {
            async resolveDynamicImport(importee, importer) {
                return this.handler(importee, importer, null);
            },
            async handler(importee, importer, resolveOptions) {
              if (importee.includes('\u0000')) {
                return importee;
              }
              if (importee.endsWith('.json')) {
                return null;
              }

              if (importer && importer.includes('\u0000')) {
                importer = '.'
              }

              async function withRetries() {
                try {
                  return await tryFind.call(this, importee, importer, resolveOptions);
                } catch (e) {
                  if (e.code === 'ERR_INVALID_ARG_VALUE') {
                    return null;
                  }
                  if (e.code !== 'MODULE_NOT_FOUND') {
                    return await withRetries.call(this)
                  }
                  throw e;
                }
              }
              let r = await withRetries.call(this);
              try {
                if (r && r.id) {
                  r.id = await fs.promises.realpath(r.id);
                } else if (r) {
                  r = await fs.promises.realpath(r);
                }
              } catch (e) {
                // pass
              }

              return r;
            }
        }
    }
}

export default emberResolver;
