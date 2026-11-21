import { createHash, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MissingTableError, StoreError } from '../data-store/errors'
import { MIGRATION_HINT, TOOLS, toolList } from './tools'

// Minimal, stateless, Streamable-HTTP-compatible MCP server over JSON-RPC 2.0. Hand-rolled (no dependency) so it is
// easy to vet in a public repo. The route handler (src/app/api/mcp/route.ts) owns HTTP concerns; this module is the
// pure logic: a constant-time bearer check and a single-message dispatcher. Everything is read-only.

export const PROTOCOL_VERSION = '2024-11-05'
export const SERVER_INFO = { name: 'roofingnearmestl-brain', version: '1.0.0' } as const

export type JsonRpcId = string | number | null
export type RpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId; error: { code: number; message: string; data?: unknown } }

export type Ctx = { getClient: () => SupabaseClient | null }

// Constant-time bearer comparison. Denies when the configured token is unset/empty (never open by default). SHA-256
// digests keep the compare constant-time regardless of input length, and the raw token is never logged or returned.
export function tokenOk(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected) return false
  if (typeof provided !== 'string' || provided.length === 0) return false
  const a = createHash('sha256').update(provided).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

// Pull the token out of an "Authorization: Bearer <token>" header; null when missing or not a bearer header.
export function bearerFrom(header: string | null | undefined): string | null {
  const m = /^Bearer\s+(.+)$/i.exec(typeof header === 'string' ? header.trim() : '')
  return m ? m[1].trim() : null
}

function result(id: JsonRpcId, value: unknown): RpcResponse {
  return { jsonrpc: '2.0', id, result: value }
}
function error(id: JsonRpcId, code: number, message: string, data?: unknown): RpcResponse {
  return { jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } }
}

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

function textResult(value: unknown, isError = false): ToolResult {
  const out: ToolResult = { content: [{ type: 'text' as const, text: JSON.stringify(value) }] }
  return isError ? { ...out, isError: true } : out
}

// Run one tool and shape it as an MCP tool result. A missing data store (null client / MissingTableError) and query
// failures become clear tool results, never thrown — the client sees the problem instead of a dropped connection.
async function callTool(name: unknown, args: unknown, ctx: Ctx): Promise<ToolResult | { __unknownTool: true }> {
  const tool = typeof name === 'string' ? TOOLS.get(name) : undefined
  if (!tool) return { __unknownTool: true }
  const client = ctx.getClient()
  if (!client) return textResult({ error: 'not_set_up', reason: 'supabase', hint: MIGRATION_HINT }, true)
  const a = args && typeof args === 'object' ? (args as Record<string, unknown>) : {}
  try {
    return textResult(await tool.run(client, a))
  } catch (e) {
    if (e instanceof MissingTableError) return textResult({ error: 'tables_not_set_up', hint: MIGRATION_HINT }, true)
    if (e instanceof StoreError) return textResult({ error: 'query_failed', code: e.code }, true)
    return textResult({ error: 'unexpected' }, true)
  }
}

// Handle a single JSON-RPC message. Returns null for notifications (requests with no id) so the caller can answer 202.
export async function handleMessage(msg: unknown, ctx: Ctx): Promise<RpcResponse | null> {
  const m = msg && typeof msg === 'object' ? (msg as Record<string, unknown>) : null
  const hasId = !!m && 'id' in m && m.id !== undefined
  const id = (hasId ? (m!.id as JsonRpcId) : null) ?? null
  const isNotification = !!m && !hasId

  if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    if (isNotification) return null
    return error(id, -32600, 'Invalid Request')
  }
  const method = m.method
  const params = (m.params && typeof m.params === 'object' ? m.params : {}) as Record<string, unknown>

  // Notifications (e.g. notifications/initialized) get no response body.
  if (isNotification) return null

  switch (method) {
    case 'initialize':
      return result(id, { protocolVersion: PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: { tools: {} } })
    case 'ping':
      return result(id, {})
    case 'tools/list':
      return result(id, { tools: toolList() })
    case 'tools/call': {
      const out = await callTool(params.name, params.arguments, ctx)
      if (out && typeof out === 'object' && '__unknownTool' in out) {
        return error(id, -32602, `Unknown tool: ${String(params.name)}`)
      }
      return result(id, out)
    }
    default:
      return error(id, -32601, `Method not found: ${method}`)
  }
}
