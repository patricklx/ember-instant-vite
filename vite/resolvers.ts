import classicProcessor from './plugins/classic-processor';
import emberResolver from './plugins/ember-resolver';
import gtsResolver from './plugins/gts-resolver';
import i18nLoader from './plugins/i18n-loader';
import { emberCodeSnippet } from './plugins/ember-code-snippet';
import { emberCliAddonDocs } from './plugins/ember-cli-addon-docs';
import classicResolver from './plugins/classic-resolver';
export const emberResolvers = (isProd) => [
    emberCodeSnippet(),
    emberCliAddonDocs(),
    emberResolver(isProd),
    classicResolver(isProd),
    gtsResolver(isProd),
    classicProcessor(),
    i18nLoader(),
]


console.log(emberResolvers())
