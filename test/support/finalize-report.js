import fs from 'node:fs'
import path from 'node:path'

const reportRoot = path.resolve(process.env.AUTOMATION_REPORT_DIR || 'AutomationTestReport/withoutDocker')
const generated = path.join(reportRoot, 'report', 'index.html')
const destination = path.join(reportRoot, 'index.html')

if (!fs.existsSync(generated)) {
  throw new Error(`Cypress did not generate ${generated}`)
}
fs.copyFileSync(generated, destination)
console.log(`Mochawesome report: ${destination}`)
