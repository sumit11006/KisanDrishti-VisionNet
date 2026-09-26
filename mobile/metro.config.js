const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable WASM support for image compression module
config.resolver.assetExts.push('wasm');

// Support for web platform
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
