
const createExpoWebpackConfig = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfig(env, argv);

  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve.alias,
      'react-native$': 'react-native-web',
      './NativeAnimatedHelper': 'react-native-web/dist/vendor/react-native/Animated/NativeAnimatedHelper'
    },
    extensions: ['.web.js', '.web.ts', '.web.tsx', ...config.resolve.extensions]
  };
  
  return config;
};