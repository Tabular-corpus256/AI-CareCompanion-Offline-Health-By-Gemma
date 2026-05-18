module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/__mocks__/nativeModules.ts'],
  moduleNameMapper: {
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@theme$': '<rootDir>/src/theme',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types$': '<rootDir>/src/types',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-fs|react-native-safe-area-context|react-native-screens|@react-native-documents|react-native-sqlite-storage)/)',
  ],
};
