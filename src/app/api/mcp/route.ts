import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/data-store/server-client'
import { bearerFrom, handleMessage, tokenOk, type Ctx, type RpcResponse } from '@/lib/mcp/server'

// Remote MCP endpoint for Mike's business brain. A single bearer-authenticated, stateless JSON-RPC 2.0 handler that
// Claude/ChatGPT/Gemini connect to as a remote (Streamable-HTTP) MCP server. It only READS the existing Supabase data
// store (brain notes, competitor intel, recommendations, metrics, sync runs and the leads table) via the server-only
// service-role client. No table or project is created here. Auth: "Authorization: Bearer <MCP_AUTH_TOKEN>" with a
// constant-time compare; if MCP_AUTH_TOKEN is unset/empty every request is denied. The token is never logged or echoed.
// See docs/mcp-server.md for setup and the connector details.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function unauthorized(): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } },
  )
}

export async function POST(req: Request): Promise<Response> {
  if (!tokenOk(bearerFrom(req.headers.get('authorization')), process.env.MCP_AUTH_TOKEN)) {
    return unauthorized()
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 })
  }

  const ctx: Ctx = { getClient: () => serverSupabase(process.env) }

  try {
    if (Array.isArray(body)) {
      if (body.length === 0) {
        return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' } }, { status: 400 })
      }
      const settled = await Promise.all(body.map((m) => handleMessage(m, ctx)))
      const responses = settled.filter((r): r is RpcResponse => r !== null)
      if (responses.length === 0) return new Response(null, { status: 202 })
      return NextResponse.json(responses)
    }

    const res = await handleMessage(body, ctx)
    if (!res) return new Response(null, { status: 202 })
    return NextResponse.json(res)
  } catch {
    // Never leak internals: a thrown error becomes a generic JSON-RPC internal error.
    console.error('MCP REQUEST FAILED', { error: 'Unexpected error' })
    return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } }, { status: 500 })
  }
}

// MCP over Streamable HTTP uses POST for requests. This stateless server opens no server-to-client stream, so GET is
// not allowed; the body states where the client should POST instead.
export function GET(): NextResponse {
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32601, message: 'Method Not Allowed: POST JSON-RPC to this endpoint' } },
    { status: 405, headers: { Allow: 'POST' } },
  )
}
