module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
      },
    ],
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@theme': './src/theme',
          '@utils': './src/utils',
          '@types': './src/types',
          '@tools': './src/tools',
        },
      },
    ],
  ],
};
