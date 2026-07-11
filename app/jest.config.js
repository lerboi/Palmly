/**
 * Jest config — Palmly app unit tests.
 * Uses the jest-expo preset (babel-preset-expo transforms, RN/Expo module mocks) so both
 * pure-logic and (later) component tests run under one harness. CI: `npm run test:ci`.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
