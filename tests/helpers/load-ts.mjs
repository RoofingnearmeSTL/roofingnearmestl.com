// Test helper: loads a .ts/.tsx source file by transpiling it with TypeScript and running it in this realm,
// with a mocked require (so tests never touch real packages, networks or databases).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '../..')
const realRequire = createRequire(import.meta.url)
const EXTS = ['', '.ts', '.tsx', '/index.ts']

function resolveFile(base) {
  for (const ext of EXTS) {
    const p = base + ext
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }
  return null
}

// Pass the same `cache` Map to several loadTs calls to share module instances (e.g. error classes for instanceof).
export function loadTs(file, { mocks = {}, env = {}, cache = new Map() } = {}) {
  const processMock = { env: { ...env } }

  function load(abs) {
    if (cache.has(abs)) return cache.get(abs).exports
    const code = ts.transpileModule(fs.readFileSync(abs, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    const mod = { exports: {} }
    cache.set(abs, mod)
    const fn = vm.runInThisContext('(function (exports, require, module, process) {' + code + '\n})', { filename: abs })
    const req = (name) => {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name]
      if (name.startsWith('./') || name.startsWith('../')) {
        const f = resolveFile(path.resolve(path.dirname(abs), name))
        if (!f) throw new Error('Cannot resolve ' + name)
        return load(f)
      }
      if (name.startsWith('@/')) {
        const f = resolveFile(path.join(root, 'src', name.slice(2)))
        if (!f) throw new Error('Cannot resolve ' + name)
        return load(f)
      }
      if (name.startsWith('node:')) return realRequire(name)
      throw new Error('Unexpected import: ' + name)
    }
    fn(mod.exports, req, mod, processMock)
    return mod.exports
  }

  const abs = path.isAbsolute(file) ? file : path.join(root, file)
  return load(abs)
}
