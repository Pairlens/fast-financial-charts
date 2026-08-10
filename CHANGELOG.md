# Changelog

All notable changes to `@pairlens/fast-financial-charts` are documented here.
This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.0.0

Packaging release. The library API is unchanged; what the package *resolves to*
is not.

### Breaking

- **The package now ships prebuilt JavaScript instead of TypeScript source.**
  Every entry point previously resolved to a `.ts`/`.tsx` file, which meant
  `npm i` followed by `import` failed on Next.js, on webpack without a TS
  loader, and on any Node runtime. Entry points now resolve to compiled ESM
  (`dist/esm`) and CommonJS (`dist/cjs`) with `.d.ts` declarations beside both.
- `src/` is no longer published. Deep imports into `src/...` were never part of
  the `exports` map, but anyone reaching past it will need to move to a public
  subpath export.
- Consumers that added this package to a bundler's transpile allowlist (for
  example Next.js `transpilePackages`) can drop that entry. Leaving it in place
  is harmless.

### Added

- `main`, `module`, and `types` fields alongside the `exports` map, plus
  `typesVersions`, so the package resolves correctly under `bundler`, `node16`,
  and legacy `node10` resolution. Verified with
  [`are-the-types-wrong`](https://arethetypeswrong.github.io) — all eleven
  subpaths green in all four modes.
- `engines.node: >=18`.
- Source maps with inlined TypeScript sources for the ESM build. The CommonJS
  build ships none: it is transpiled from the emitted ESM, so its map could only
  point at intermediate output.
- `@types/react` declared as an optional peer dependency. The shipped
  declarations reference it for the React component's prop types, including from
  the `/types` entry.
- `scripts/build.mjs`: emits the dual dist, rewrites every relative specifier to
  an explicit `./x.js`, and fails the build if a specifier cannot be resolved on
  disk. Wired to `prepack`, so a publish can never ship a stale or missing
  `dist`.
- `scripts/smoke-test.mjs` (`bun run smoke`): packs the tarball, installs it
  into a throwaway project, and asserts that all eleven subpaths import under
  Node ESM, require under CommonJS, bundle for the browser with no TypeScript
  loader configured, and typecheck under both `bundler` and `node16` resolution
  (the first with `skipLibCheck` off).
- `bun run lint:package`: `publint --strict` plus `are-the-types-wrong`.
- CI and the publish workflow now run the build, the package lint, and the
  consumer smoke test.

### Fixed

- The indicator Web Worker is now code-split into its own chunk by webpack,
  Turbopack, and Vite with no configuration. It previously pointed at
  `./indicator.worker.ts`, a path those bundlers could not compile without a
  TypeScript loader.
- `createIndicatorWorkerClient` no longer throws when the worker's module URL
  cannot be resolved (notably under CommonJS, which has no `import.meta.url`).
  It falls back to inline indicator compute, which was already the behaviour for
  every other worker failure mode.

## 1.5.3 and earlier

See the [release history](https://github.com/Pairlens/fast-financial-charts/releases).
