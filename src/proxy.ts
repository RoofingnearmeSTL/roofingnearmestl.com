import { NextResponse, type NextRequest } from 'next/server'
import { checkBasicAuth, AUTH_REALM } from './lib/dashboard-auth'

// Password gate for the owner dashboard. Runs only for the paths in config.matcher, never for public pages.
export function proxy(request: NextRequest) {
  const result = checkBasicAuth(request.headers.get('authorization'), process.env.DASHBOARD_PASSWORD)
  const headers: Record<string, string> = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' }
  if (result === 'not_configured') return new NextResponse('Not found', { status: 404, headers })
  if (result === 'unauthorized') {
    return new NextResponse('Password required', {
      status: 401,
      headers: { ...headers, 'WWW-Authenticate': `Basic realm="${AUTH_REALM}", charset="UTF-8"` },
    })
  }
  const response = NextResponse.next()
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v)
  return response
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/api/dashboard/:path*'],
}
