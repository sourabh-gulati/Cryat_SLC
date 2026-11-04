import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.CRYAT_URL || 'http://localhost:0901',
    launchOptions: process.platform === 'win32'
      ? { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }
      : {}
  },
  reporter: 'list'
})
