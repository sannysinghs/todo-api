module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Close the connection after all tests are complete
  globalTeardown: './jest.teardown.js',
}; 