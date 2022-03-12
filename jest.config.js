module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: {
    '^common/(.*)$': '<rootDir>/src/common/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|js)$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/**/*.d.ts'],
  modulePathIgnorePatterns: ['<rootDir>/out/'],
};
