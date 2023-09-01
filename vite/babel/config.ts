const pkg = require('../../package.json');

export default function() {
  return {
    visitor: {
      ImportDeclaration(path) {
        const name = path.node.source.value;
        if (name.endsWith('/config/environment')) {
          path.node.source.value = pkg.name + '/config/environment';
        }
      },
    },
  };
}
