module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/tests/**/*.test.(js|ts)',
    '**/__tests__/**/*.(js|ts)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'integration.test.js',
    'supabase.test.js',
    'gemini.test.js',
    'firecrawl.test.js',
    'imageupload.test.js',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|@sentry/react-native|native-base|react-native-svg)',
  ],
};
