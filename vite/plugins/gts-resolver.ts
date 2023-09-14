import { transform } from 'ember-template-tag';
const fileRegex = /.*\.(gts|gjs)$/;

export default function hbsResolver() {
  return {
    name: 'gts-resolver',
    enforce: 'pre',
    transform(src, id) {
      if (fileRegex.test(id, id)) {
        const out = transform({
          input: src,
          includeSourceMaps: true,
          relativePath: id
        });
        return {
          code: out.output,
          map: out.map,
        };
      }
    },
  };
}
