import 'server-only';

import { DebateStatus, Prisma, VoteRound, VoteSide } from '@prisma/client';
import { randomBytes } from 'node:crypto';

import { apiError } from './http';
import { prisma } from './prisma';

export type VoteTally = {
  pro: number;
  con: number;
  total: number;
  proPercent: number;
  conPercent: number;
  winner: VoteSide | 'TIE' | null;
};

export type DebateTopicRecord = {
  id: string;
  debateId: string;
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
};

export type DebateRecord = {
  id: string;
  publicToken: string;
  ownerId: string;
  title: string;
  theme: string;
  status: DebateStatus;
  currentTopicId: string | null;
  finalWinner: VoteSide | null;
  finalSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DebateState = {
  debate: DebateRecord;
  topics: DebateTopicRecord[];
  currentTopic: DebateTopicRecord | null;
  currentRound: VoteRound | null;
  liveCounts: VoteTally | null;
  hideLiveProgress: boolean;
  finalResult: VoteTally | null;
};

type DebateWithRelations = DebateRecord & {
  topics: DebateTopicRecord[];
  currentTopic: DebateTopicRecord | null;
};

type TopicInput = {
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position?: number;
};

const FINAL_SCOPE_KEY = 'FINAL';

function generatePublicToken() {
  return randomBytes(16).toString('base64url');
}

function normalizeTopics(topics: TopicInput[]) {
  return topics.map((topic, index) => ({
    ...topic,
    position: topic.position ?? index,
  }));
}

function serializeDebate(debate: DebateRecord) {
  return debate;
}

function serializeTopic(topic: DebateTopicRecord) {
  return topic;
}

function getVoteScope(debate: DebateWithRelations) {
  if (debate.status === DebateStatus.FINAL) {
    return {
      round: VoteRound.FINAL,
      scopeKey: FINAL_SCOPE_KEY,
      topicId: null as string | null,
    };
  }

  if (!debate.currentTopicId || !debate.currentTopic) {
    return null;
  }

  return {
    round: VoteRound.TOPIC,
    scopeKey: `TOPIC:${debate.currentTopicId}`,
    topicId: debate.currentTopicId,
  };
}

async function getVoteTally(where: Prisma.VoteWhereInput): Promise<VoteTally> {
  const grouped = await prisma.vote.groupBy({
    by: ['side'],
    where,
    _count: {
      _all: true,
    },
  });

  let pro = 0;
  let con = 0;

  for (const row of grouped) {
    if (row.side === VoteSide.PRO) {
      pro = row._count._all;
    }

    if (row.side === VoteSide.CON) {
      con = row._count._all;
    }
  }

  const total = pro + con;

  return {
    pro,
    con,
    total,
    proPercent: total === 0 ? 0 : Math.round((pro / total) * 1000) / 10,
    conPercent: total === 0 ? 0 : Math.round((con / total) * 1000) / 10,
    winner: pro === con ? 'TIE' : pro > con ? VoteSide.PRO : VoteSide.CON,
  };
}

function parseFinalResult(summary: string | null, fallback: VoteTally | null) {
  if (!summary) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(summary) as VoteTally;
    if (
      typeof parsed?.pro === 'number' &&
      typeof parsed?.con === 'number' &&
      typeof parsed?.total === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Fall back to live counts.
  }

  return fallback;
}

async function loadDebateForOwner(ownerId: string, debateId: string) {
  const debate = await prisma.debate.findFirst({
    where: {
      id: debateId,
      ownerId,
    },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  if (!debate) {
    throw apiError(404, 'DEBATE_NOT_FOUND', 'Debate not found');
  }

  return debate as DebateWithRelations;
}

async function loadDebateByPublicToken(publicToken: string) {
  const debate = await prisma.debate.findUnique({
    where: { publicToken },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  if (!debate) {
    throw apiError(404, 'DEBATE_NOT_FOUND', 'Debate not found');
  }

  return debate as DebateWithRelations;
}

function serializeState(
  debate: DebateWithRelations,
  liveCounts: VoteTally | null,
  finalResult: VoteTally | null,
  hideLiveProgress: boolean,
): DebateState & DebateRecord {
  const currentScope = getVoteScope(debate);

  return {
    ...debate,
    debate: serializeDebate(debate),
    topics: debate.topics.map(serializeTopic),
    currentTopic: debate.currentTopic ? serializeTopic(debate.currentTopic) : null,
    currentRound: currentScope?.round ?? null,
    liveCounts,
    hideLiveProgress,
    finalResult,
  };
}

export async function listDebatesForOwner(ownerId: string) {
  const debates = await prisma.debate.findMany({
    where: { ownerId },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  return debates.map((debate) =>
    serializeState(debate as DebateWithRelations, null, null, false),
  );
}

export async function getDebateForOwner(ownerId: string, debateId: string) {
  const debate = await loadDebateForOwner(ownerId, debateId);
  const scope = getVoteScope(debate);

  const liveCounts = scope
    ? await getVoteTally({
        debateId: debate.id,
        round: scope.round,
        topicId: scope.topicId,
        scopeKey: scope.scopeKey,
      })
    : null;

  const finalResult =
    debate.status === DebateStatus.ENDED
      ? parseFinalResult(
          debate.finalSummary,
          await getVoteTally({
            debateId: debate.id,
            round: VoteRound.FINAL,
            scopeKey: FINAL_SCOPE_KEY,
          }),
        )
      : null;

  return serializeState(
    debate,
    liveCounts,
    finalResult,
    debate.status === DebateStatus.FINAL,
  );
}

export async function getDebateForPublic(publicToken: string) {
  const debate = await loadDebateByPublicToken(publicToken);
  const scope = getVoteScope(debate);

  const liveCounts =
    scope && debate.status === DebateStatus.LIVE
      ? await getVoteTally({
          debateId: debate.id,
          round: scope.round,
          topicId: scope.topicId,
          scopeKey: scope.scopeKey,
        })
      : null;

  const finalResult =
    debate.status === DebateStatus.ENDED
      ? parseFinalResult(
          debate.finalSummary,
          await getVoteTally({
            debateId: debate.id,
            round: VoteRound.FINAL,
            scopeKey: FINAL_SCOPE_KEY,
          }),
        )
      : null;

  return serializeState(
    debate,
    liveCounts,
    finalResult,
    debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED,
  );
}

export async function createDebate(
  ownerId: string,
  input: { title: string; theme: string; topics: TopicInput[] },
) {
  const publicToken = generatePublicToken();
  const topics = normalizeTopics(input.topics);

  const debate = await prisma.debate.create({
    data: {
      publicToken,
      ownerId,
      title: input.title,
      theme: input.theme,
      status: DebateStatus.LIVE,
      topics: {
        create: topics,
      },
    },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  return serializeState(debate as DebateWithRelations, null, null, false);
}

export async function updateDebate(
  ownerId: string,
  debateId: string,
  input: { title?: string; theme?: string },
) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_LOCKED', 'This debate is locked');
  }

  const updated = await prisma.debate.update({
    where: { id: debateId },
    data: input,
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  return serializeState(updated as DebateWithRelations, null, null, false);
}

export async function deleteDebate(ownerId: string, debateId: string) {
  await loadDebateForOwner(ownerId, debateId);

  await prisma.debate.delete({
    where: { id: debateId },
  });

  return { deleted: true };
}

export async function addTopic(ownerId: string, debateId: string, input: TopicInput) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_LOCKED', 'This debate is locked');
  }

  const maxPosition = await prisma.topic.aggregate({
    where: { debateId },
    _max: { position: true },
  });

  const topic = await prisma.topic.create({
    data: {
      debateId,
      title: input.title,
      detail: input.detail,
      proView: input.proView,
      conView: input.conView,
      position: input.position ?? (maxPosition._max.position ?? -1) + 1,
    },
  });

  return serializeTopic(topic);
}

export async function updateTopic(
  ownerId: string,
  debateId: string,
  topicId: string,
  input: Partial<TopicInput>,
) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_LOCKED', 'This debate is locked');
  }

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      debateId,
    },
  });

  if (!topic) {
    throw apiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  }

  const updated = await prisma.topic.update({
    where: { id: topicId },
    data: input,
  });

  return serializeTopic(updated);
}

export async function deleteTopic(ownerId: string, debateId: string, topicId: string) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_LOCKED', 'This debate is locked');
  }

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      debateId,
    },
  });

  if (!topic) {
    throw apiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  }

  if (debate.currentTopicId === topicId && debate.status === DebateStatus.LIVE) {
    throw apiError(409, 'ACTIVE_TOPIC', 'Change the active topic before deleting it');
  }

  const topicCount = await prisma.topic.count({
    where: { debateId },
  });

  if (topicCount <= 1) {
    throw apiError(409, 'MIN_TOPIC_COUNT', 'A debate must keep at least one topic');
  }

  await prisma.topic.delete({
    where: { id: topicId },
  });

  return { deleted: true };
}

export async function setCurrentTopic(
  ownerId: string,
  debateId: string,
  topicId: string | null,
) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.FINAL || debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_LOCKED', 'This debate is locked');
  }

  if (topicId === null) {
    const updated = await prisma.debate.update({
      where: { id: debateId },
      data: {
        currentTopicId: null,
        status: DebateStatus.DRAFT,
      },
      include: {
        topics: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        currentTopic: true,
      },
    });

    return serializeState(updated as DebateWithRelations, null, null, false);
  }

  const topic = await prisma.topic.findFirst({
    where: {
      id: topicId,
      debateId,
    },
  });

  if (!topic) {
    throw apiError(404, 'TOPIC_NOT_FOUND', 'Topic not found');
  }

  const updated = await prisma.debate.update({
    where: { id: debateId },
    data: {
      currentTopicId: topicId,
      status: DebateStatus.LIVE,
    },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  return serializeState(updated as DebateWithRelations, null, null, false);
}

export async function moveDebateToFinalRound(ownerId: string, debateId: string) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status === DebateStatus.ENDED) {
    throw apiError(409, 'DEBATE_ENDED', 'Final results have already been generated');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany({
      where: {
        debateId,
        round: VoteRound.FINAL,
        scopeKey: FINAL_SCOPE_KEY,
      },
    });

    return tx.debate.update({
      where: { id: debateId },
      data: {
        status: DebateStatus.FINAL,
        currentTopicId: null,
        finalWinner: null,
        finalSummary: null,
      },
      include: {
        topics: {
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        },
        currentTopic: true,
      },
    });
  });

  return serializeState(updated as DebateWithRelations, null, null, true);
}

export async function resetCurrentRoundVotes(ownerId: string, debateId: string) {
  const debate = await loadDebateForOwner(ownerId, debateId);
  const scope = getVoteScope(debate);

  if (!scope) {
    throw apiError(409, 'NO_ACTIVE_ROUND', 'There is no active round to reset');
  }

  const deleted = await prisma.vote.deleteMany({
    where: {
      debateId,
      round: scope.round,
      topicId: scope.topicId,
      scopeKey: scope.scopeKey,
    },
  });

  return {
    round: scope.round,
    deletedVotes: deleted.count,
  };
}

export async function submitPublicVote(
  publicToken: string,
  input: {
    voterKey: string;
    side: VoteSide;
    topicId?: string;
  },
) {
  const debate = await loadDebateByPublicToken(publicToken);

  if (debate.status !== DebateStatus.LIVE && debate.status !== DebateStatus.FINAL) {
    throw apiError(409, 'VOTING_CLOSED', 'Voting is not open for this debate');
  }

  const scope = getVoteScope(debate);

  if (!scope) {
    throw apiError(409, 'NO_ACTIVE_ROUND', 'There is no active voting round');
  }

  if (scope.round === VoteRound.TOPIC) {
    if (input.topicId && input.topicId !== scope.topicId) {
      throw apiError(409, 'TOPIC_MISMATCH', 'Votes must target the active topic');
    }
  } else if (input.topicId) {
    throw apiError(409, 'FINAL_TOPIC_MISMATCH', 'Final round votes do not use a topic id');
  }

  const vote = await prisma.vote.upsert({
    where: {
      debateId_scopeKey_voterKey: {
        debateId: debate.id,
        scopeKey: scope.scopeKey,
        voterKey: input.voterKey,
      },
    },
    create: {
      debateId: debate.id,
      topicId: scope.topicId,
      round: scope.round,
      scopeKey: scope.scopeKey,
      side: input.side,
      voterKey: input.voterKey,
    },
    update: {
      topicId: scope.topicId,
      round: scope.round,
      scopeKey: scope.scopeKey,
      side: input.side,
    },
  });

  const liveCounts =
    debate.status === DebateStatus.LIVE
      ? await getVoteTally({
          debateId: debate.id,
          round: scope.round,
          topicId: scope.topicId,
          scopeKey: scope.scopeKey,
        })
      : null;

  return {
    vote,
    state: serializeState(
      debate,
      liveCounts,
      null,
      debate.status === DebateStatus.FINAL,
    ),
  };
}

export async function finalizeDebate(ownerId: string, debateId: string) {
  const debate = await loadDebateForOwner(ownerId, debateId);

  if (debate.status !== DebateStatus.FINAL && debate.status !== DebateStatus.ENDED) {
    throw apiError(409, 'FINAL_ROUND_REQUIRED', 'Move the debate into the final round first');
  }

  const finalTally = await getVoteTally({
    debateId,
    round: VoteRound.FINAL,
    scopeKey: FINAL_SCOPE_KEY,
  });

  if (debate.status === DebateStatus.ENDED) {
    return serializeState(
      debate,
      finalTally,
      parseFinalResult(debate.finalSummary, finalTally) ?? finalTally,
      false,
    );
  }

  const winner = finalTally.winner === 'TIE' ? null : finalTally.winner;

  const updated = await prisma.debate.update({
    where: { id: debateId },
    data: {
      status: DebateStatus.ENDED,
      currentTopicId: null,
      finalWinner: winner,
      finalSummary: JSON.stringify(finalTally),
    },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });

  return serializeState(updated as DebateWithRelations, finalTally, finalTally, false);
}

export async function getOwnerDebates(ownerId: string) {
  return prisma.debate.findMany({
    where: { ownerId },
    include: {
      topics: {
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      },
      currentTopic: true,
    },
  });
}

export const resolveVoteScope = getVoteScope;

export async function getVoteTotals(
  debateId: string,
  topicId: string | null,
  round: VoteRound,
) {
  const scopeKey = round === VoteRound.FINAL ? FINAL_SCOPE_KEY : `TOPIC:${topicId ?? ''}`;
  return getVoteTally({
    debateId,
    topicId,
    round,
    scopeKey,
  });
}

export const clearVotesForScope = async (
  debateId: string,
  topicId: string | null,
  round: VoteRound,
) =>
  prisma.vote.deleteMany({
    where: {
      debateId,
      topicId,
      round,
      scopeKey: round === VoteRound.FINAL ? FINAL_SCOPE_KEY : `TOPIC:${topicId ?? ''}`,
    },
  });

export async function upsertVote(input: {
  debateId: string;
  topicId: string | null;
  round: VoteRound;
  side: VoteSide;
  voterKey: string;
}) {
  const scopeKey = input.round === VoteRound.FINAL ? FINAL_SCOPE_KEY : `TOPIC:${input.topicId ?? ''}`;

  return prisma.vote.upsert({
    where: {
      debateId_scopeKey_voterKey: {
        debateId: input.debateId,
        scopeKey,
        voterKey: input.voterKey,
      },
    },
    create: {
      debateId: input.debateId,
      topicId: input.topicId,
      round: input.round,
      scopeKey,
      side: input.side,
      voterKey: input.voterKey,
    },
    update: {
      topicId: input.topicId,
      round: input.round,
      scopeKey,
      side: input.side,
    },
  });
}

export async function createTopic(
  ownerId: string,
  debateId: string,
  input: TopicInput,
) {
  try {
    return await addTopic(ownerId, debateId, input);
  } catch {
    return null;
  }
}

export async function getDebateByPublicToken(publicToken: string) {
  return getDebateForPublic(publicToken);
}

export function buildStagePath(publicToken: string) {
  return `/stage/${publicToken}`;
}

export function buildVotePath(publicToken: string) {
  return `/vote/${publicToken}`;
}
