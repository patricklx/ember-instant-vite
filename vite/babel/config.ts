import pkg from '../../package.json';
import fs from 'node:fs';


const isAddon = fs.existsSync('addon');

let pkgName = pkg.name;

if (isAddon) {
  pkgName = 'dummy';
}


export default function() {
  return {
    visitor: {
      ImportDeclaration(path) {
        const name = path.node.source.value;
        if (name.endsWith('/config/environment')) {
          path.node.source.value = pkgName + '/config/environment';
        }
      },
    },
  };
}
