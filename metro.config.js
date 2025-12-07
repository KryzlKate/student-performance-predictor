const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    'react': require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
    'react-native-web': require.resolve('react-native-web'),
  },
  resolverMainFields: ['react-native', 'browser', 'main'],
};

module.exports = config;