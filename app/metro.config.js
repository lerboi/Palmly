const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// `palm-landmarks` is a local package symlinked from ../modules/palm-landmarks (P2 native spike).
// Its own node_modules exists only for nitrogen/tsc devDeps and contains a SECOND copy of react —
// if Metro ever resolves that copy the app dies with "Cannot read property 'useMemo' of null".
// Block the nested node_modules entirely and alias the module's runtime deps to the app's copies.
const palmLandmarksRoot = path.resolve(__dirname, '..', 'modules', 'palm-landmarks');
const escapeForRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.watchFolders = [...(config.watchFolders ?? []), palmLandmarksRoot];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList != null
      ? [config.resolver.blockList]
      : []),
  new RegExp(`${escapeForRegExp(path.join(palmLandmarksRoot, 'node_modules'))}[\\\\/].*`),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: path.resolve(__dirname, 'node_modules', 'react'),
  'react-native': path.resolve(__dirname, 'node_modules', 'react-native'),
  'react-native-nitro-modules': path.resolve(__dirname, 'node_modules', 'react-native-nitro-modules'),
  'react-native-vision-camera': path.resolve(__dirname, 'node_modules', 'react-native-vision-camera'),
};

module.exports = config;
