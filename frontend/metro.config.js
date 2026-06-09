const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  isCSSEnabled: true,
});

// Allow Metro to bundle .onnx binary model files as assets
config.resolver.assetExts.push('onnx');

module.exports = config;