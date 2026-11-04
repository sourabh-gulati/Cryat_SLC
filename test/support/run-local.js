import { spawn } from 'node:child_process'
import path from 'node:path'

const mode = process.argv[2]
if (!['ui', 'api', 'all'].includes(mode)) {
  throw new Error('Use ui, api, or all')
}

const root = process.cwd()
const children = []

function launch(args, options = {}) {
  const child = spawn(process.execPath, args, {
    cwd: options.cwd || root,
    env: options.env || process.env,
    stdio: 'inherit'
  })
  children.push(child)
  return child
}

async function waitFor(url, child) {
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited before ${url} became ready`)
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function stopServers() {
  for (const child of children) {
    if (child.exitCode === null) child.kill()
  }
}

process.on('SIGINT', () => { stopServers(); process.exit(130) })
process.on('SIGTERM', () => { stopServers(); process.exit(143) })

try {
  if (mode !== 'ui') {
    const api = launch(['test/support/api-harness.js'])
    await waitFor('http://127.0.0.1:3001/api/health', api)
  }
  if (mode !== 'api') {
    const web = launch([path.resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: path.join(root, 'client') })
    await waitFor('http://127.0.0.1:4173/', web)
  }

  const args = ['test/support/run-cypress.js', mode]
  const env = {
    ...process.env,
    CRYAT_URL: mode === 'api' ? 'http://127.0.0.1:3001' : 'http://127.0.0.1:4173',
    TEST_API_URL: 'http://127.0.0.1:3001'
  }
  delete env.ELECTRON_RUN_AS_NODE
  const cypress = launch(args, { env })
  const code = await new Promise(resolve => cypress.on('exit', resolve))
  process.exitCode = code ?? 1
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  stopServers()
}
