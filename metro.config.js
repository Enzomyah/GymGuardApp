const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure cjs, mjs, and css extensions are included in sourceExts
['cjs', 'mjs', 'css'].forEach((ext) => {
  if (!config.resolver.sourceExts.includes(ext)) {
    config.resolver.sourceExts.push(ext);
  }
});

// Force single-instance module resolution for @firebase core packages.
// This prevents Metro from loading duplicate CJS (dist/index.cjs.js) and ESM
// (dist/esm/index.esm2017.js) copies of @firebase/app and @firebase/component,
// which breaks component registration ("Component auth has not been registered yet").
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@firebase/app') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@firebase/app/dist/index.cjs.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === '@firebase/component') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@firebase/component/dist/index.cjs.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
