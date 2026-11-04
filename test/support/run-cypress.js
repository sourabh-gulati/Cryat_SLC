import { spawn } from 'node:child_process'
import path from 'node:path'

const mode = process.argv[2]
if (!['ui', 'api', 'all'].includes(mode)) throw new Error('Use ui, api, or all')

await import('./prepare-report.js')

const args = [path.resolve('node_modules/cypress/bin/cypress'), 'run', '--browser', 'chrome']
if (mode !== 'all') args.push('--spec', `test/${mode}/**/*.cy.js`)
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const cypress = spawn(process.execPath, args, { stdio: 'inherit', env })

const code = await new Promise((resolve, reject) => {
  cypress.on('error', reject)
  cypress.on('exit', resolve)
})

process.exitCode = code ?? 1
