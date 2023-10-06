
export function emberCodeSnippet(id) {
    return {
        resolveId(id) {
            if (id === 'ember-code-snippet/snippets') {
                return id;
            }
            return null;
        },
        load(id) {
            if (id === 'ember-code-snippet/snippets') {
                return {
                    code: 'export default {}'
                };
            }
            return null;
        }
    }
}

