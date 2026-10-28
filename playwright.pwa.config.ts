import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pwa',
  outputDir: 'build/pwa-test-results',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'build/pwa-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:5175', trace: 'retain-on-failure' },
  webServer: {
    command:
      'npx vite preview apps/web --outDir ../../build/foundation --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
