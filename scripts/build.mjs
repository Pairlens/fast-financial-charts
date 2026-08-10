// Build the publishable dist tree.
//
//   dist/esm  – ESM JavaScript + .d.ts, emitted by tsc, module-per-file so the
//               package tree-shakes and every subpath export shares one copy of
//               the module graph.
//   dist/cjs  – the same tree transpiled to CommonJS for `require()` consumers.
//
// tsc emits extensionless relative specifiers (the source uses bundler
// resolution). Node's ESM resolver requires real paths, so we rewrite every
// relative specifier in the emitted .js and .d.ts to an explicit `./x.js` or
// `./x/index.js` and fail the build if one cannot be resolved on disk.

import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const ESM = path.join(DIST, 'esm')
const CJS = path.join(DIST, 'cjs')

// Progress goes to stderr so `npm pack --json` (which runs prepack) keeps a
// clean, parseable stdout.
const log = (message) => console.error(`[build] ${message}`)

/** @returns {string[]} every file under `dir` matching `test` */
const walk = (dir, test, found = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, test, found)
    else if (test(entry.name)) found.push(full)
  }
  return found
}

// ---------------------------------------------------------------------------
// 1. Clean + emit ESM JavaScript and declarations
// ---------------------------------------------------------------------------

fs.rmSync(DIST, { recursive: true, force: true })
log('emitting ESM + declarations via tsc')
execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '--project', 'tsconfig.build.json'],
  // tsc reports diagnostics on stdout; route them to stderr so stdout stays clean.
  { cwd: ROOT, stdio: ['ignore', 2, 2] },
)

// ---------------------------------------------------------------------------
// 2. Rewrite relative specifiers to fully-qualified ESM paths
// ---------------------------------------------------------------------------

const HAS_EXTENSION = /\.(js|mjs|cjs|json|node)$/

/**
 * Resolve `spec` (relative, extensionless) as written inside `fromFile` and
 * return the specifier Node's ESM resolver needs.
 */
const resolveSpecifier = (fromFile, spec, isDeclaration) => {
  if (HAS_EXTENSION.test(spec)) return spec

  const base = path.resolve(path.dirname(fromFile), spec)
  const fileExt = isDeclaration ? '.d.ts' : '.js'

  if (fs.existsSync(base + fileExt)) return `${spec}.js`
  if (fs.existsSync(path.join(base, `index${fileExt}`))) return `${spec}/index.js`

  // A .d.ts may point at a type-only module that produced no .js, and vice
  // versa. Fall back to the sibling extension before giving up.
  const otherExt = isDeclaration ? '.js' : '.d.ts'
  if (fs.existsSync(base + otherExt)) return `${spec}.js`
  if (fs.existsSync(path.join(base, `index${otherExt}`))) return `${spec}/index.js`

  return null
}

const SPECIFIER_PATTERNS = [
  // import x from './y'   |   export * from './y'   |   import './y'
  /\b(from|import)(\s+)(['"])(\.[^'"]*)\3/g,
  // import('./y') — dynamic imports and `import(...)` types in declarations
  /\b(import)(\s*\()(['"])(\.[^'"]*)\3/g,
]

// `new Worker(new URL('./x.worker.ts', import.meta.url))` points at a source
// file; in dist the sibling is the emitted .js.
const WORKER_URL_PATTERN = /(\bnew URL\(\s*)(['"])(\.[^'"]*)\.tsx?\2/g

const unresolved = []

const rewriteEsmSpecifiers = (file) => {
  const isDeclaration = file.endsWith('.d.ts')
  let code = fs.readFileSync(file, 'utf8')

  for (const pattern of SPECIFIER_PATTERNS) {
    code = code.replace(pattern, (match, keyword, gap, quote, spec) => {
      const resolved = resolveSpecifier(file, spec, isDeclaration)
      if (resolved === null) {
        unresolved.push(`${path.relative(DIST, file)} -> ${spec}`)
        return match
      }
      return `${keyword}${gap}${quote}${resolved}${quote}`
    })
  }

  code = code.replace(
    WORKER_URL_PATTERN,
    (_match, prefix, quote, spec) => `${prefix}${quote}${spec}.js${quote}`,
  )

  fs.writeFileSync(file, code)
}

const emitted = walk(ESM, (name) => name.endsWith('.js') || name.endsWith('.d.ts'))
emitted.forEach(rewriteEsmSpecifiers)
log(`rewrote specifiers in ${emitted.length} files`)

if (unresolved.length > 0) {
  console.error('[build] unresolved relative imports:\n  ' + unresolved.join('\n  '))
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 3. Transpile the ESM tree to CommonJS
// ---------------------------------------------------------------------------

// `import.meta` is a syntax error in CommonJS. The only consumer is the
// indicator Web Worker's module URL, and the worker client already falls back
// to inline computation when the URL cannot be resolved — so CJS consumers get
// inline indicator compute rather than a broken module.
const IMPORT_META_URL = /\bimport\.meta\.url\b/g

// Transpiling the *emitted ESM* rather than the TypeScript source is what makes
// this safe: type-only re-exports have already been elided by tsc, so there is
// no isolated-modules hazard. The trade-off is that a CommonJS source map could
// only point back at the intermediate ESM output, never at the original .ts —
// so we ship none rather than ship a misleading one. dist/esm carries full maps
// with inlined TypeScript sources.
const CJS_COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  allowJs: true,
  sourceMap: false,
  newLine: ts.NewLineKind.LineFeed,
}

log('transpiling CommonJS build')
let cjsCount = 0

for (const file of emitted) {
  const relative = path.relative(ESM, file)
  const target = path.join(CJS, relative)
  fs.mkdirSync(path.dirname(target), { recursive: true })

  if (file.endsWith('.d.ts')) {
    // Declarations are format-neutral; the dist/cjs/package.json type marker is
    // what tells TypeScript to read them under CommonJS resolution.
    fs.copyFileSync(file, target)
    continue
  }

  const source = fs
    .readFileSync(file, 'utf8')
    .replace(IMPORT_META_URL, 'undefined')
    // Drop the ESM build's sourceMappingURL; it names a map that does not exist
    // beside the CommonJS output.
    .replace(/\/\/# sourceMappingURL=.*\n?$/, '')

  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: CJS_COMPILER_OPTIONS,
  })

  fs.writeFileSync(target, outputText)
  cjsCount += 1
}

log(`transpiled ${cjsCount} CommonJS modules`)

// ---------------------------------------------------------------------------
// 4. Module-format markers
// ---------------------------------------------------------------------------

fs.writeFileSync(path.join(ESM, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`)
fs.writeFileSync(path.join(CJS, 'package.json'), `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`)

const shipped = walk(DIST, () => true)
const bytes = shipped.reduce((sum, f) => sum + fs.statSync(f).size, 0)
log(`dist ready — ${(bytes / 1024 / 1024).toFixed(1)} MB across ${shipped.length} files`)
