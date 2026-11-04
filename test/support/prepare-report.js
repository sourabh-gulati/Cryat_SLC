import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('AutomationTestReport')
const selected = path.resolve(process.env.AUTOMATION_REPORT_DIR || path.join(root, 'withoutDocker'))
const allowed = ['withoutDocker', 'withDocker'].map(name => path.join(root, name))

if (!allowed.includes(selected)) {
  throw new Error(`Report directory must be AutomationTestReport/withoutDocker or AutomationTestReport/withDocker: ${selected}`)
}

fs.mkdirSync(selected, { recursive: true })
for (const name of fs.readdirSync(selected)) {
  if (name !== '.gitkeep') fs.rmSync(path.join(selected, name), { recursive: true, force: true })
}
console.log(`Writing Cypress report to ${selected}`)
