import { NextRequest, NextResponse } from 'next/server'
import { DebateStatus } from '@prisma/client'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { finalizeDebate, getDebateForOwner } from '@/lib/debate'

type RouteParams = {
  debateId: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  const user = await getCurrentUserFromCookies(request.cookies)

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { debateId } = await params
  const debate = await getDebateForOwner(user.id, debateId)

  if (!debate) {
    return NextResponse.json({ error: '找不到辩论会' }, { status: 404 })
  }

  if (debate.status !== DebateStatus.FINAL) {
    return NextResponse.json({ error: '请先进入终极投票' }, { status: 409 })
  }

  const updated = await finalizeDebate(user.id, debateId)

  if (!updated) {
    return NextResponse.json({ error: '无法生成结果' }, { status: 500 })
  }

  return NextResponse.json({
    debate: updated,
  })
}

