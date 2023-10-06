const pkg = require('../../package.json');
const fs = require('node:fs');


const isAddon = fs.existsSync('addon');

let pkgName = pkg.name;

if (isAddon) {
  pkgName = 'dummy';
}


module.exports = function() {
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
