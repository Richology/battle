import { NextRequest, NextResponse } from 'next/server'
import { buildClearedSessionCookieOptions, deleteSessionByToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (token) {
    await deleteSessionByToken(token)
  }

  const response = NextResponse.json({
    ok: true,
  })

  response.cookies.set(SESSION_COOKIE, '', buildClearedSessionCookieOptions())
  return response
}
