// End-to-end consumer smoke test.
//
// Packs the package exactly as npm would publish it, installs the tarball into
// a throwaway project, and proves the three things a consumer actually needs:
//
//   1. `import` works under Node ESM for every subpath export.
//   2. `require` works under CommonJS for every subpath export.
//   3. A bundler with no TypeScript loader configured (esbuild, standing in for
//      webpack/Vite/Next.js) can resolve and bundle the whole module graph.
//   4. TypeScript finds types under both `bundler` and `node16` resolution.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

/** Subpath -> a named export that must exist at runtime. */
const SUBPATHS = {
  '.': 'ChartEngine',
  './types': null, // types-only module: it just has to load
  './mcp': 'ChartMcpExecutor',
  './indicators': null,
  './drawings': null,
  './theme': 'DEFAULT_CHART_THEME',
  './financial-chart': null,
  './depth-chart': null,
  './react': 'FastFinancialChart',
  './react/financial-chart': null,
  './react/depth-chart': null,
}

const log = (message) => console.log(`[smoke] ${message}`)
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: process.env })
const capture = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', env: process.env })

const specifier = (subpath) =>
  subpath === '.' ? PKG.name : `${PKG.name}${subpath.slice(1)}`

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'ffc-smoke-'))
let failed = false

try {
  // -------------------------------------------------------------------------
  // Pack the real tarball (prepack rebuilds dist, so this is never stale)
  // -------------------------------------------------------------------------
  log('packing tarball')
  const packed = JSON.parse(capture('npm', ['pack', '--json', '--pack-destination', work], ROOT))
  const tarball = path.join(work, packed[0].filename)
  log(`${packed[0].filename} — ${(packed[0].size / 1024 / 1024).toFixed(2)} MB, ${packed[0].entryCount} files`)

  const shipsSource = packed[0].files.some((f) => f.path.startsWith('src/'))
  const shipsJs = packed[0].files.some((f) => f.path.endsWith('.js'))
  const shipsTypes = packed[0].files.some((f) => f.path.endsWith('.d.ts'))
  if (shipsSource) throw new Error('tarball still ships raw TypeScript under src/')
  if (!shipsJs) throw new Error('tarball ships no JavaScript')
  if (!shipsTypes) throw new Error('tarball ships no type declarations')

  // -------------------------------------------------------------------------
  // Throwaway consumer project
  // -------------------------------------------------------------------------
  const app = path.join(work, 'app')
  fs.mkdirSync(app)
  fs.writeFileSync(
    path.join(app, 'package.json'),
    JSON.stringify(
      {
        name: 'ffc-smoke-consumer',
        version: '1.0.0',
        private: true,
        type: 'module',
        dependencies: {
          [PKG.name]: `file:${tarball}`,
          react: '^19.2.0',
          'react-dom': '^19.2.0',
        },
        devDependencies: {
          '@types/react': '^19.2.14',
          esbuild: '^0.25.0',
          typescript: '^5.9.3',
        },
      },
      null,
      2,
    ),
  )

  log('installing tarball into a clean project')
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel', 'error'], app)

  // -------------------------------------------------------------------------
  // 1. Node ESM
  // -------------------------------------------------------------------------
  const esmChecks = Object.entries(SUBPATHS)
    .map(([subpath, expected]) => {
      const check = expected
        ? `if (typeof m[${JSON.stringify(expected)}] === 'undefined') throw new Error('missing export ${expected} from ${specifier(subpath)}')`
        : `void m`
      return `{ const m = await import(${JSON.stringify(specifier(subpath))}); ${check}; console.log('  esm ok  ${specifier(subpath)}') }`
    })
    .join('\n')
  fs.writeFileSync(path.join(app, 'esm-check.mjs'), `${esmChecks}\n`)

  log('checking Node ESM imports')
  run('node', ['esm-check.mjs'], app)

  // -------------------------------------------------------------------------
  // 2. Node CommonJS
  // -------------------------------------------------------------------------
  const cjsChecks = Object.entries(SUBPATHS)
    .map(([subpath, expected]) => {
      const check = expected
        ? `if (typeof m[${JSON.stringify(expected)}] === 'undefined') throw new Error('missing export ${expected} from ${specifier(subpath)}')`
        : `void m`
      return `{ const m = require(${JSON.stringify(specifier(subpath))}); ${check}; console.log('  cjs ok  ${specifier(subpath)}') }`
    })
    .join('\n')
  fs.writeFileSync(path.join(app, 'cjs-check.cjs'), `${cjsChecks}\n`)

  log('checking CommonJS requires')
  run('node', ['cjs-check.cjs'], app)

  // -------------------------------------------------------------------------
  // 3. Bundler resolution with no TypeScript loader configured
  // -------------------------------------------------------------------------
  const bundleEntry = Object.keys(SUBPATHS)
    .map((subpath, i) => `export * as ns${i} from ${JSON.stringify(specifier(subpath))}`)
    .join('\n')
  fs.writeFileSync(path.join(app, 'bundle-entry.js'), `${bundleEntry}\n`)

  log('bundling for the browser (esbuild, no TS loader)')
  run(
    path.join(app, 'node_modules', '.bin', 'esbuild'),
    [
      'bundle-entry.js',
      '--bundle',
      '--format=esm',
      '--platform=browser',
      '--target=es2022',
      '--external:react',
      '--external:react-dom',
      '--outfile=bundle.js',
      '--log-level=warning',
    ],
    app,
  )
  const bundleSize = fs.statSync(path.join(app, 'bundle.js')).size
  log(`bundle ok — ${(bundleSize / 1024).toFixed(0)} kB for all ${Object.keys(SUBPATHS).length} entry points`)

  // -------------------------------------------------------------------------
  // 4. TypeScript resolution, both modern modes
  // -------------------------------------------------------------------------
  const tsEntry = Object.keys(SUBPATHS)
    .map((subpath, i) => `import * as ns${i} from ${JSON.stringify(specifier(subpath))}\nexport const use${i} = ns${i}`)
    .join('\n')
  fs.writeFileSync(path.join(app, 'ts-check.ts'), `${tsEntry}\n`)

  // The Bundler pass runs with skipLibCheck off, so the shipped .d.ts tree has
  // to be internally consistent — not merely resolvable.
  for (const [moduleKind, moduleResolution, skipLibCheck] of [
    ['ESNext', 'Bundler', false],
    ['Node16', 'Node16', true],
  ]) {
    fs.writeFileSync(
      path.join(app, `tsconfig.${moduleResolution}.json`),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            module: moduleKind,
            moduleResolution,
            jsx: 'react-jsx',
            lib: ['ES2022', 'DOM', 'DOM.Iterable'],
            strict: true,
            skipLibCheck,
            noEmit: true,
          },
          files: ['ts-check.ts'],
        },
        null,
        2,
      ),
    )
    log(
      `typechecking consumer with moduleResolution=${moduleResolution}` +
        (skipLibCheck ? '' : ' (skipLibCheck off)'),
    )
    run(
      path.join(app, 'node_modules', '.bin', 'tsc'),
      ['--project', `tsconfig.${moduleResolution}.json`],
      app,
    )
  }

  log('all consumer checks passed')
} catch (error) {
  failed = true
  console.error(`[smoke] FAILED: ${error.message}`)
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}

process.exit(failed ? 1 : 0)
