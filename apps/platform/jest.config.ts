import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Resolve @/* path aliases to the platform root
    '^@/(.*)$': '<rootDir>/$1',
    // Replace workspace db package with a hand-written mock
    '^@governs-ai/db$': '<rootDir>/__mocks__/prisma.ts',
    '^@governs-ai/(.*)$': '<rootDir>/__mocks__/governs-ai/$1.ts',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          moduleResolution: 'node',
          noUnusedLocals: false,
          noUnusedParameters: false,
          noImplicitReturns: false,
          noFallthroughCasesInSwitch: false,
          strict: false,
        },
      },
    ],
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'app/api/v1/**/*.ts',
    'lib/**/*.ts',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
};

export default config;
