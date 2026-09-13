# Dependency Audit & Security Triage Report

**Project:** Nextly
**Audit Date:** September 13, 2026
**Scope:** Runtime dependencies vs. development build tooling (`package.json`)
**Status:** **0 vulnerabilities in production runtime dependencies** (`npm audit --omit=dev` exits with code 0).

---

## 1. Executive Summary

Nextly is a local-first client-side web application executed completely in the user's browser. It has zero backend, zero Node.js server runtime, and zero external cloud sync services.

To ensure strict security and minimal attack surface:

1. **Runtime dependencies** were cleaned to strictly essential UI/React libraries (`@headlessui/react`, `@heroicons/react`, `framer-motion`, `react`, `react-dom`, `react-hot-toast`).
2. Build-time tooling (`@tailwindcss/forms`, `autoprefixer`, `postcss`, `tailwindcss`) was moved from `dependencies` to `devDependencies`.
3. The legacy `uuid` package (`^9.0.1`, which had GHSA-w5hq-g745-h8pq) was completely eliminated in favor of the browser and Node native `crypto.randomUUID()` with a safe pseudo-random fallback in `src/utils/id.ts`.
4. Result: `npm audit --omit=dev` reports **0 vulnerabilities**.

---

## 2. Production Runtime Dependencies (`--omit=dev`)

| Package             | Version    | Vulnerabilities | Runtime Exposure & Justification                          |
| :------------------ | :--------- | :-------------: | :-------------------------------------------------------- |
| `react`             | `^18.2.0`  |        0        | Core UI rendering framework.                              |
| `react-dom`         | `^18.2.0`  |        0        | React DOM rendering layer.                                |
| `@headlessui/react` | `^1.7.18`  |        0        | Accessible modal and transition primitives.               |
| `@heroicons/react`  | `^2.1.1`   |        0        | SVG iconography.                                          |
| `framer-motion`     | `^11.18.2` |        0        | Animation library with `prefers-reduced-motion` guards.   |
| `react-hot-toast`   | `^2.4.1`   |        0        | Actionable feedback notifications and Undo toast actions. |

**Production Audit Result:** `found 0 vulnerabilities` (Clean).

---

## 3. Development & Build Tooling Triage (`devDependencies`)

All remaining audit findings reside exclusively in development/build tools. These tools are executed only on the developer machine or in CI during `npm run lint` and `npm run build`. None of their code is packaged into or reachable from client browsers.

| Tool Area                   | Packages                                                                     |    Severity     | Exposure Analysis & Triage Decision                                                                                                                                                                                                        |
| :-------------------------- | :--------------------------------------------------------------------------- | :-------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Linter Tools**            | `eslint`, `@eslint/plugin-kit`, `@humanfs/node`, `ajv`, `js-yaml`, `flatted` | Moderate / High | **No client risk.** Used exclusively by ESLint during local or CI static analysis. None of these packages are bundled into the client distribution (`dist/`).                                                                              |
| **Glob & Pattern Matchers** | `brace-expansion`, `minimatch`, `glob`, `picomatch`                          |      High       | **No client risk.** Sub-dependencies of ESLint and TypeScript AST parser. Used strictly for local file globbing (`eslint .` and `test/*.test.ts`). Not bundled in client output.                                                           |
| **Vite / Bundler Tools**    | `vite`, `esbuild`, `rollup`                                                  | Moderate / High | **No client risk.** Local development server (`vite`) and production bundler (`rollup`). CVEs relate to local dev server requests and CLI file traversal during build. The static production output in `dist/` is pure static HTML/JS/CSS. |
| **CSS Preprocessing**       | `postcss`, `postcss-selector-parser`, `browserslist`, `nanoid`               |      High       | **No client risk.** Used strictly during build time by Tailwind CSS to compile `src/index.css` into `dist/assets/index.css`. Output CSS is sanitized and contains zero executable JS.                                                      |

---

## 4. Remediation Actions Taken

1. **Native ID Generation:**
   Created `src/utils/id.ts` leveraging standard `crypto.randomUUID()` with fallback. Removed `uuid` and `@types/uuid`, eliminating GHSA-w5hq-g745-h8pq entirely without introducing breaking changes or library bloat.
2. **Strict Manifest Separation:**
   Moved all PostCSS and Tailwind packages from `dependencies` to `devDependencies` in `package.json`.
3. **Verification:**
    - `npm audit --omit=dev` → **0 vulnerabilities**.
    - `npm test` & `TZ=America/Los_Angeles npm test` → **45/45 tests passing**.
    - `npm run lint` → **0 errors, 0 warnings**.
    - `npm run build` → **Clean build (JS 404.76 kB / 124.43 kB gzip)**.
