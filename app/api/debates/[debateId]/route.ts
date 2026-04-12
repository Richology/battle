import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { getDebateForOwner, updateDebate } from '@/lib/debate'
import { updateDebateSchema } from '@/lib/validation'

type RouteParams = {
  debateId: string
}

export async function GET(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const debate = await getDebateForOwner(user.id, debateId)

  if (!debate) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  return NextResponse.json({ debate })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const payload = await request.json().catch(() => null)
  const parsed = updateDebateSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: '更新内容不完整' }, { status: 400 })
  }

  const debate = await updateDebate(user.id, debateId, parsed.data)

  if (!debate) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  return NextResponse.json({ debate })
}

