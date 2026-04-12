import { NextRequest, NextResponse } from 'next/server'
import { createSessionForUser, buildSessionCookieOptions, SESSION_COOKIE, normalizeEmail, verifyPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '邮箱或密码格式不正确',
      },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      {
        error: '邮箱或密码错误',
      },
      { status: 401 },
    )
  }

  const session = await createSessionForUser(user.id)
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  })

  response.cookies.set(SESSION_COOKIE, session.token, buildSessionCookieOptions(session.expiresAt))
  return response
}
