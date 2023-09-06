import loader from 'loader.js';
globalThis.define = globalThis.define || loader.define;
globalThis.require = globalThis.require || loader.require;
globalThis.requirejs = globalThis.requirejs || loader.require;
globalThis.requireModule = globalThis.requireModule || loader.require;
