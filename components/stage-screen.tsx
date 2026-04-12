'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge, Panel } from './ui';
import { QRCodeCard } from './qr-code';

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

const emptyVoteTally: VoteTally = {
  pro: 0,
  con: 0,
  total: 0,
  proPercent: 0,
  conPercent: 0,
  winner: null,
};

function getStatusLabel(status: DebateStatus) {
  switch (status) {
    case 'DRAFT':
      return '草稿';
    case 'LIVE':
      return '辩题进行中';
    case 'FINAL':
      return '终局投票';
    case 'ENDED':
      return '已结束';
  }
}

function getVoteSummary(state: PublicDebateState) {
  return state.finalResult ?? state.liveCounts ?? emptyVoteTally;
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

function LiveMeter({ debate, topic }: { debate: PublicDebateState; topic: string | null }) {
  const summary = getVoteSummary(debate);
  const total = summary.total || 1;
  const proWidth = `${Math.max(8, (summary.pro / total) * 100)}%`;
  const conWidth = `${Math.max(8, (summary.con / total) * 100)}%`;

  return (
    <div className="live-meter" aria-label="实时投票进度">
      <div className="live-meter__track">
        <div className="live-meter__pro" style={{ width: proWidth }}>
          <strong>{summary.pro}</strong>
          <span>{summary.proPercent}%</span>
        </div>
        <div className="live-meter__con" style={{ width: conWidth }}>
          <strong>{summary.con}</strong>
          <span>{summary.conPercent}%</span>
        </div>
      </div>
      <div className="live-meter__labels">
        <span>正方</span>
        <span>反方</span>
      </div>
    </div>
  );
}

export function StageScreen({
  token,
  initialState,
}: {
  token: string;
  initialState: PublicDebateState | null;
}) {
  const [state, setState] = useState<PublicDebateState | null>(initialState);
  const [loaded, setLoaded] = useState(Boolean(initialState));
  const [error, setError] = useState<string | null>(null);

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
      <main className="stage-screen page-shell">
        <Panel className="stage-screen__fallback">
          <Badge tone="neutral">加载中</Badge>
          <h1>正在读取公屏内容。</h1>
          <p>如果这是第一次打开，先等后台写入辩论会数据。</p>
        </Panel>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="stage-screen page-shell">
        <Panel className="stage-screen__fallback">
          <Badge tone="warn">未找到辩论会</Badge>
          <h1>{error ?? '这个 token 目前没有对应的公屏内容。'}</h1>
          <p>你可以先去控制台创建一个辩论会，再把这个链接发给现场屏幕。</p>
          <div className="stage-screen__fallback-actions">
            <Link className="ui-button ui-button--outline" href="/dashboard">
              去控制台
            </Link>
            <Link className="ui-button ui-button--solid" href="/">
              返回首页
            </Link>
          </div>
        </Panel>
      </main>
    );
  }

  const topic = state.currentTopic ?? state.topics.find((item) => item.id === state.currentTopicId) ?? null;
  const voteUrl = `/vote/${token}`;
  const summary = getVoteSummary(state);
  const isFinalRound = state.currentRound === 'FINAL' || state.hideLiveProgress;

  return (
    <main className="stage-screen page-shell">
      <section className="stage-screen__canvas">
        <div className="stage-screen__header">
          <div>
            <Badge tone={state.status === 'ENDED' ? 'success' : state.status === 'FINAL' ? 'warn' : 'neutral'}>
              {getStatusLabel(state.status)}
            </Badge>
            <h1>{state.title}</h1>
            <p>{state.theme}</p>
          </div>

          <div className="stage-screen__header-meta">
            <span>token / {state.publicToken}</span>
            <span>{error ? error : '实时同步已就绪'}</span>
          </div>
        </div>

        {state.status === 'ENDED' ? (
          <section className="stage-screen__final">
            <Panel className="stage-screen__final-card">
              <span>最终结果</span>
              <strong>
                {state.finalWinner === 'PRO'
                  ? '正方胜出'
                  : state.finalWinner === 'CON'
                    ? '反方胜出'
                    : '平局'}
              </strong>
              <p>{state.finalSummary ?? '结果已经生成。'}</p>
            </Panel>
            <div className="stage-screen__final-qr">
              <QRCodeCard url={voteUrl} label="终局扫码投票" />
            </div>
          </section>
        ) : isFinalRound ? (
          <section className="stage-screen__final">
            <Panel className="stage-screen__final-card stage-screen__final-card--waiting">
              <span>终局投票进行中</span>
              <strong>公屏不显示实时进度</strong>
              <p>让现场观众扫描二维码完成最后一票，然后回到控制台生成最终结果。</p>
            </Panel>
            <div className="stage-screen__final-qr">
              <QRCodeCard url={voteUrl} label="终局扫码投票" />
            </div>
          </section>
        ) : (
          <section className="stage-screen__topic-mode">
            <div className="stage-screen__topic-meta">
              <Badge tone="hot">当前辩题</Badge>
              <h2>{topic?.title ?? '等待辩题切换'}</h2>
              <p>{topic?.detail ?? '控制台里还没有激活任何辩题。'}</p>
            </div>

            <div className="stage-screen__debate-layout">
              <Panel className="opinion-card opinion-card--pro">
                <span>正方观点</span>
                <p>{topic?.proView ?? '正方观点尚未填写。'}</p>
              </Panel>

              <div className="stage-screen__center">
                <QRCodeCard url={voteUrl} label="扫码投票" className="stage-screen__qr" />
                <div className="stage-screen__vote-note">
                  <span>现场投票中</span>
                  <strong>{summary.total} 张有效票</strong>
                </div>
              </div>

              <Panel className="opinion-card opinion-card--con">
                <span>反方观点</span>
                <p>{topic?.conView ?? '反方观点尚未填写。'}</p>
              </Panel>
            </div>

            <LiveMeter debate={state} topic={topic?.id ?? null} />
          </section>
        )}

        <div className="stage-screen__footer">
          <span>公网投票入口</span>
          <Link href={voteUrl}>{voteUrl}</Link>
          <Link className="ui-button ui-button--outline ui-button--sm" href="/dashboard">
            返回控制台
          </Link>
        </div>
      </section>
    </main>
  );
}
