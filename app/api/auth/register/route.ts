import { NextRequest, NextResponse } from 'next/server'
import { createSessionForUser, buildSessionCookieOptions, SESSION_COOKIE, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: '邮箱或密码格式不正确',
      },
      { status: 400 },
    )
  }

  const { email, password } = parsed.data
  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  if (existing) {
    return NextResponse.json(
      {
        error: '这个邮箱已经注册过了',
      },
      { status: 409 },
    )
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  const session = await createSessionForUser(user.id)
  const response = NextResponse.json(
    {
      user,
    },
    { status: 201 },
  )

  response.cookies.set(SESSION_COOKIE, session.token, buildSessionCookieOptions(session.expiresAt))
  return response
}
