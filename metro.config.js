const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, 'src');

const config = {
  resolver: {
    extraNodeModules: {
      '@components': path.resolve(root, 'components'),
      '@hooks': path.resolve(root, 'hooks'),
      '@services': path.resolve(root, 'services'),
      '@screens': path.resolve(root, 'screens'),
      '@navigation': path.resolve(root, 'navigation'),
      '@theme': path.resolve(root, 'theme'),
      '@utils': path.resolve(root, 'utils'),
      '@types': path.resolve(root, 'types'),
    },
  },
  watchFolders: [root],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
