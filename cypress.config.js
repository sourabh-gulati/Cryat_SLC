import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'cypress'

const require = createRequire(import.meta.url)
const reportRoot = process.env.AUTOMATION_REPORT_DIR || 'AutomationTestReport/withoutDocker'
const reportIndex = path.join(reportRoot, 'index.html')
const generatedReport = path.join(reportRoot, 'report', 'index.html')
const localApiUrl = 'http://127.0.0.1:3001'

async function fixtureReady() {
  try {
    const response = await fetch(`${localApiUrl}/__test/state`)
    return response.ok
  } catch {
    return false
  }
}

export default defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: path.join(reportRoot, 'report'),
    reportFilename: 'index',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveJson: true
  },
  screenshotsFolder: `${reportRoot}/screenshots`,
  videosFolder: `${reportRoot}/videos`,
  video: false,
  screenshotOnRunFailure: true,
  env: {
    apiBaseUrl: process.env.TEST_API_URL || localApiUrl
  },
  e2e: {
    baseUrl: process.env.CRYAT_URL || 'http://127.0.0.1:0901',
    specPattern: 'test/{ui,api}/**/*.cy.js',
    supportFile: 'test/support/e2e.js',
    async setupNodeEvents(on) {
      const reportHooks = {}
      require('cypress-mochawesome-reporter/plugin')((event, handler) => {
        reportHooks[event] = handler
      })
      on('before:run', async details => {
        fs.rmSync(reportIndex, { force: true })
        await reportHooks['before:run'](details)
      })
      on('after:run', async results => {
        await reportHooks['after:run'](results)
        if (!fs.existsSync(generatedReport)) throw new Error(`Cypress did not generate ${generatedReport}`)
        fs.copyFileSync(generatedReport, reportIndex)
      })

      // A direct `npx cypress run` still needs the isolated API fixture server.
      // Managed local and Docker runs pass TEST_API_URL and start their own server.
      if (!process.env.TEST_API_URL && !(await fixtureReady())) {
        const fixture = spawn(process.execPath, ['test/support/api-harness.js'], {
          cwd: process.cwd(),
          env: { ...process.env, PORT: '3001' },
          stdio: 'inherit'
        })
        const stopFixture = () => { if (fixture.exitCode === null) fixture.kill() }
        process.once('exit', stopFixture)

        const deadline = Date.now() + 30000
        while (Date.now() < deadline && fixture.exitCode === null) {
          if (await fixtureReady()) return
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        stopFixture()
        throw new Error(`Cypress API fixture server did not start at ${localApiUrl}`)
      }
    }
  }
})
