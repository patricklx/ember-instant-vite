import { isAddon } from '../../utils';


const appRoot = (isAddon) ? 'tests/dummy/app' : 'app';


export function emberCliAddonDocs() {
  return {
    resolveId(id) {
      if (id === 'ember-cli-addon-docs/app-files') {
        return id;
      }
      if (id === 'ember-cli-addon-docs/addon-files') {
        return id;
      }
      return null;
    },
    load(id) {
      if (id === 'ember-cli-addon-docs/app-files') {
        return {
          code: `export default Object.keys(import.meta.glob("../../${appRoot}/**/*"))`
        }
      }
      if (id === 'ember-cli-addon-docs/addon-files') {
        return {
          code: 'export default Object.keys(import.meta.glob("../../addon/**/*"))'
        }
      }
      return null;
    }
  }
}
