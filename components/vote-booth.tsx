'use client';

import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Panel } from './ui';

const STORAGE_PREFIX = 'battle-voter-key';

type VoteSide = 'PRO' | 'CON';
type DebateState = {
  debate: {
    status: 'DRAFT' | 'LIVE' | 'FINAL' | 'ENDED';
    title: string;
  };
  currentTopic: {
    id: string;
    title: string;
    detail: string;
    proView: string;
    conView: string;
    position: number;
  } | null;
  topics: Array<{
    id: string;
    title: string;
    detail: string;
    proView: string;
    conView: string;
    position: number;
  }>;
  currentRound: 'TOPIC' | 'FINAL' | null;
  hideLiveProgress: boolean;
  finalResult: {
    pro: number;
    con: number;
    total: number;
    proPercent: number;
    conPercent: number;
    winner: VoteSide | 'TIE' | null;
  } | null;
};

function ensureKey(storageKey: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  const current = window.localStorage.getItem(storageKey);
  if (current) {
    return current;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(storageKey, next);
  return next;
}

export function VoteBooth({
  state,
  publicToken,
}: {
  state: DebateState;
  publicToken: string;
}) {
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${publicToken}`, [publicToken]);
  const [voterKey, setVoterKey] = useState('');
  const [busy, setBusy] = useState<VoteSide | null>(null);
  const [selectedSide, setSelectedSide] = useState<VoteSide | null>(null);
  const [message, setMessage] = useState<string>('扫码后点击一侧即可投票。');
  const activeTopic = state.currentTopic ?? state.topics[0] ?? null;

  useEffect(() => {
    setVoterKey(ensureKey(storageKey));
  }, [storageKey]);

  async function castVote(side: VoteSide) {
    if (!voterKey) {
      return;
    }

    setBusy(side);
    setSelectedSide(side);
    setMessage('正在提交投票…');

    const response = await fetch(`/api/public/debates/${publicToken}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voterKey,
        side,
        ...(state.currentRound === 'TOPIC' && activeTopic ? { topicId: activeTopic.id } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? '投票失败，请稍后再试。');
      setBusy(null);
      return;
    }

    setBusy(null);
    setMessage(side === 'PRO' ? '已提交正方投票。' : '已提交反方投票。');
  }

  const finalWinner =
    state.finalResult?.winner === 'TIE'
      ? '平局'
      : state.finalResult?.winner === 'PRO'
        ? '正方胜利'
        : state.finalResult?.winner === 'CON'
          ? '反方胜利'
          : null;

  return (
    <Panel className="vote-booth">
      <div className="vote-booth__top">
        <Badge tone={state.hideLiveProgress ? 'warn' : 'hot'}>
          {state.debate.status === 'ENDED' ? '结果已生成' : state.hideLiveProgress ? '终局投票' : '现场投票'}
        </Badge>
        <span>{state.debate.title}</span>
      </div>

      <div className="vote-booth__headline">
        <h1>{activeTopic?.title ?? '终局投票'}</h1>
        <p>{activeTopic?.detail ?? '请完成最后一轮投票，结果将由主持人统一生成。'}</p>
      </div>

      <div className="vote-booth__grid">
        <button
          type="button"
          className={`vote-choice vote-choice--pro ${selectedSide === 'PRO' ? 'vote-choice--selected' : ''}`}
          onClick={() => void castVote('PRO')}
          disabled={busy !== null}
        >
          <span>正方</span>
          <strong>{activeTopic?.proView ?? '支持正方观点'}</strong>
        </button>

        <button
          type="button"
          className={`vote-choice vote-choice--con ${selectedSide === 'CON' ? 'vote-choice--selected' : ''}`}
          onClick={() => void castVote('CON')}
          disabled={busy !== null}
        >
          <span>反方</span>
          <strong>{activeTopic?.conView ?? '支持反方观点'}</strong>
        </button>
      </div>

      <div className="vote-booth__footer">
        <p>{message}</p>
        {state.finalResult && finalWinner ? (
          <Badge tone={state.finalResult.winner === 'PRO' ? 'pro' : state.finalResult.winner === 'CON' ? 'con' : 'neutral'}>
            {finalWinner}
          </Badge>
        ) : null}
      </div>
    </Panel>
  );
}
