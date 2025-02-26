const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer')
  };

  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg', 'tsx', 'ts', 'js', 'jsx', 'json'],
    resolverMainFields: ['react-native', 'browser', 'main'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules')
    ],
    extraNodeModules: {
      '@': path.resolve(__dirname, 'src'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@assets': path.resolve(__dirname, 'src/assets'),
      '@navigation': path.resolve(__dirname, 'src/navigation')
    }
  };

  return config;
})();