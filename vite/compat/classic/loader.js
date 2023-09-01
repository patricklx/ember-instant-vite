import loader from 'loader.js';
globalThis.define = loader.define;
globalThis.require = loader.require;
globalThis.requirejs = loader.require;
globalThis.requireModule = loader.require;
