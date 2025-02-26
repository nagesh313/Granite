module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@screens': './src/screens',
            '@navigation': './src/navigation',
            '@components': './src/components',
            '@config': './src/config',
            '@assets': './src/assets',
            '@types': './src/types'
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.jsx',
            '.js',
            '.json',
          ],
        },
      ],
    ],
  };
};