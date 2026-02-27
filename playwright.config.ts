import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 393, height: 852 },
  },
  reporter: [['list']],
});
