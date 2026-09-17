import { defineConfig } from '@rstest/core';

// Docs: https://rstest.rs/config/
export default defineConfig({
  reporters: 'verbose',
  expect: {
    poll: { timeout: 10_000 },
  },
  setupFiles: ['./tests/rstest.setup.ts'],
});
