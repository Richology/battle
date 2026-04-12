import { NextRequest, NextResponse } from 'next/server'
import { VoteRound } from '@prisma/client'
import { getCurrentUserFromCookies } from '@/lib/auth'
import { clearVotesForScope, getDebateForOwner, resolveVoteScope } from '@/lib/debate'

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

  const scope = resolveVoteScope(debate)
  if (!scope) {
    return NextResponse.json({ error: '当前没有可清空的投票' }, { status: 409 })
  }
  const result = await clearVotesForScope(debateId, scope.topicId, scope.round ?? VoteRound.TOPIC)

  return NextResponse.json({
    deletedCount: result.count,
  })
}
