'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge, Panel } from './ui';

type VoteSide = 'PRO' | 'CON';
type DebateStatus = 'DRAFT' | 'LIVE' | 'FINAL' | 'ENDED';

type VoteTally = {
  pro: number;
  con: number;
  total: number;
  proPercent: number;
  conPercent: number;
  winner: VoteSide | 'TIE' | null;
};

type TopicRecord = {
  id: string;
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position: number;
};

type PublicDebateState = {
  id: string;
  publicToken: string;
  title: string;
  theme: string;
  status: DebateStatus;
  currentTopicId: string | null;
  finalWinner: VoteSide | null;
  finalSummary: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  topics: TopicRecord[];
  currentTopic: TopicRecord | null;
  currentRound: 'TOPIC' | 'FINAL' | null;
  liveCounts: VoteTally | null;
  hideLiveProgress: boolean;
  finalResult: VoteTally | null;
};

const VISITOR_KEY = 'battle-visitor-key';
const CHOICE_PREFIX = 'battle-vote-choice';

function getStatusLabel(status: DebateStatus) {
  switch (status) {
    case 'DRAFT':
      return '未开始';
    case 'LIVE':
      return '进行中';
    case 'FINAL':
      return '终局投票';
    case 'ENDED':
      return '已结束';
  }
}

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string | { message?: string } }
    | null;

  if (typeof payload?.error === 'string') {
    return payload.error;
  }

  if (payload?.error && typeof payload.error === 'object' && 'message' in payload.error) {
    return typeof payload.error.message === 'string' ? payload.error.message : '请求失败';
  }

  return '请求失败';
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function VoteScreen({
  token,
  initialState,
}: {
  token: string;
  initialState: PublicDebateState | null;
}) {
  const [state, setState] = useState<PublicDebateState | null>(initialState);
  const [loaded, setLoaded] = useState(Boolean(initialState));
  const [visitorKey, setVisitorKey] = useState<string | null>(null);
  const [choice, setChoice] = useState<VoteSide | null>(null);
  const [message, setMessage] = useState<string>('扫码后点击一侧即可投票。');
  const [error, setError] = useState<string | null>(null);

  const topic = state?.currentTopic ?? state?.topics.find((item) => item.id === state?.currentTopicId) ?? null;
  const roundKey = state?.currentRound === 'FINAL' || state?.hideLiveProgress
    ? 'FINAL'
    : `TOPIC:${state?.currentTopicId ?? 'none'}`;
  const choiceStorageKey = useMemo(() => `${CHOICE_PREFIX}:${token}:${roundKey}`, [token, roundKey]);

  useEffect(() => {
    const saved = window.localStorage.getItem(VISITOR_KEY);
    const next = saved ?? uid('voter');
    window.localStorage.setItem(VISITOR_KEY, next);
    setVisitorKey(next);
  }, []);

  useEffect(() => {
    if (!choiceStorageKey) {
      return;
    }

    const saved = window.localStorage.getItem(choiceStorageKey);
    setChoice(saved === 'PRO' || saved === 'CON' ? saved : null);
  }, [choiceStorageKey]);

  useEffect(() => {
    let alive = true;

    async function load() {
      const response = await fetch(`/api/public/debates/${token}`, {
        cache: 'no-store',
      });

      if (!alive) {
        return;
      }

      if (!response.ok) {
        setState(null);
        setError(await readErrorMessage(response));
        setLoaded(true);
        return;
      }

      const payload = (await response.json()) as { debate: PublicDebateState };
      setState(payload.debate);
      setError(null);
      setLoaded(true);
    }

    void load();
    const timer = window.setInterval(() => void load(), 2500);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [token]);

  if (!loaded) {
    return (
      <main className="vote-screen page-shell">
        <Panel className="vote-screen__fallback">
          <Badge tone="neutral">加载中</Badge>
          <h1>正在读取投票页内容。</h1>
          <p>如果这是第一次打开，先等内容加载完成。</p>
        </Panel>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="vote-screen page-shell">
        <Panel className="vote-screen__fallback">
          <Badge tone="warn">未找到辩论会</Badge>
          <h1>{error ?? '这个投票地址还没有对应的辩论会。'}</h1>
          <p>你可以先去活动台创建一场，再把这个二维码发给观众。游客扫码就能投票，不需要登录。</p>
          <div className="vote-screen__fallback-actions">
            <Link className="ui-button ui-button--solid" href="/dashboard">
              去活动台
            </Link>
            <Link className="ui-button ui-button--outline" href="/">
              返回首页
            </Link>
          </div>
        </Panel>
      </main>
    );
  }

  const isFinalRound = state.currentRound === 'FINAL' || state.hideLiveProgress;
  const heading = isFinalRound ? '终局投票' : topic?.title ?? '当前题目';
  const detail =
    isFinalRound
      ? '只保留终局选项，不显示实时进度。投完之后你仍然可以在同一台设备上更换选择。'
      : topic?.detail ?? '现场投票准备中。';

  async function vote(side: VoteSide) {
    if (!visitorKey) {
      return;
    }

    const response = await fetch(`/api/public/debates/${token}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voterKey: visitorKey,
        side,
        ...(isFinalRound ? {} : { topicId: topic?.id }),
      }),
    });

    if (!response.ok) {
      setMessage(await readErrorMessage(response));
      return;
    }

    setChoice(side);
    window.localStorage.setItem(choiceStorageKey, side);
    setMessage(side === 'PRO' ? '你已投给正方。' : '你已投给反方。');
  }

  return (
    <main className="vote-screen page-shell">
      <section className="vote-screen__canvas">
        <div className="vote-screen__header">
          <Badge tone={state.status === 'ENDED' ? 'success' : state.status === 'FINAL' ? 'warn' : 'neutral'}>
            {getStatusLabel(state.status)}
          </Badge>
          <h1>{state.title}</h1>
          <p>{state.theme}</p>
          <span className="vote-screen__header-meta">
            {visitorKey ? '本设备会记住你的选择，方便你重新改票。' : '正在准备投票状态。'}
          </span>
        </div>

        <Panel className="vote-screen__card">
          <div className="vote-screen__topic">
            <span>本轮投票</span>
            <strong>{heading}</strong>
            <p>{detail}</p>
          </div>

          <div className="vote-screen__choices">
            <button
              type="button"
              className={`vote-choice vote-choice--pro ${choice === 'PRO' ? 'vote-choice--selected' : ''}`}
              onClick={() => void vote('PRO')}
              disabled={state.status === 'ENDED'}
            >
              <span>正方</span>
              <strong>支持</strong>
              <p>我更认同这一方的判断。</p>
            </button>
            <button
              type="button"
              className={`vote-choice vote-choice--con ${choice === 'CON' ? 'vote-choice--selected' : ''}`}
              onClick={() => void vote('CON')}
              disabled={state.status === 'ENDED'}
            >
              <span>反方</span>
              <strong>反对</strong>
              <p>我更认同另一种判断。</p>
            </button>
          </div>

          <div className="vote-screen__footer">
            <div className="vote-screen__status">
              <span>当前选择</span>
              <strong>{choice === 'PRO' ? '正方' : choice === 'CON' ? '反方' : '尚未投票'}</strong>
            </div>
            {message ? <p>{message}</p> : null}
          </div>
        </Panel>

        {state.status === 'ENDED' ? (
          <Panel className="vote-screen__ended">
            <Badge tone="success">结果已生成</Badge>
            <strong>
              {state.finalWinner === 'PRO'
                ? '正方胜出'
                : state.finalWinner === 'CON'
                  ? '反方胜出'
                  : '平局'}
            </strong>
            <p>{state.finalSummary ?? '最终结果已揭晓。'}</p>
          </Panel>
        ) : (
          <Panel className="vote-screen__ended vote-screen__ended--muted">
            <Badge tone={isFinalRound ? 'warn' : 'neutral'}>{isFinalRound ? '终局模式' : '题目模式'}</Badge>
            <strong>这张票可以随时改</strong>
            <p>同一台设备会保存你的选择，你再次扫码后可以直接覆盖原来的选择。</p>
          </Panel>
        )}
      </section>
    </main>
  );
}
