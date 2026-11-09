// Database error helpers. Pure, no imports. Only fixed, safe strings ever leave the server.

type DbErr = { code?: unknown } | null | undefined

export function isMissingTable(err: DbErr): boolean {
  const c = err && typeof err === 'object' ? err.code : undefined
  return c === 'PGRST205' || c === '42P01'
}

export function isMissingColumn(err: DbErr): boolean {
  const c = err && typeof err === 'object' ? err.code : undefined
  return c === '42703' || c === 'PGRST204'
}

export function safeCode(v: unknown): string {
  return typeof v === 'string' && /^[A-Za-z0-9_]{1,60}$/.test(v) ? v : 'unknown'
}

export class MissingTableError extends Error {
  constructor() {
    super('Data store tables are missing')
    this.name = 'MissingTableError'
  }
}

export class StoreError extends Error {
  op: string
  code: string
  constructor(op: string, code: string) {
    super(`Database ${op} failed (${code})`)
    this.name = 'StoreError'
    this.op = op
    this.code = code
  }
}
