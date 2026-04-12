'use client';

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
type DebateState = {
  debate: {
    title: string;
    theme: string;
    status: DebateStatus;
    finalSummary: string | null;
  };
  topics: Array<{
    id: string;
    title: string;
    detail: string;
    proView: string;
    conView: string;
    position: number;
  }>;
  currentTopic: {
    id: string;
    title: string;
    detail: string;
    proView: string;
    conView: string;
    position: number;
  } | null;
  currentRound: 'TOPIC' | 'FINAL' | null;
  liveCounts: VoteTally | null;
  hideLiveProgress: boolean;
  finalResult: VoteTally | null;
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

function getStageLabel(state: DebateState) {
  if (state.debate.status === 'ENDED' || state.finalResult) {
    return '最终结果';
  }

  if (state.hideLiveProgress) {
    return '终局投票';
  }

  return '实时投票';
}

function ProgressBar({ tally }: { tally: VoteTally }) {
  const total = Math.max(tally.total, 1);
  const proWidth = `${(tally.pro / total) * 100}%`;
  const conWidth = `${(tally.con / total) * 100}%`;

  return (
    <div className="vote-meter">
      <div className="vote-meter__track">
        <span className="vote-meter__fill vote-meter__fill--pro" style={{ width: proWidth }} />
        <span className="vote-meter__fill vote-meter__fill--con" style={{ width: conWidth }} />
      </div>
      <div className="vote-meter__labels">
        <div>
          <strong>{tally.pro}</strong>
          <span>{tally.proPercent}% 正方</span>
        </div>
        <div>
          <strong>{tally.con}</strong>
          <span>{tally.conPercent}% 反方</span>
        </div>
      </div>
    </div>
  );
}

export function StageBoard({
  state,
  voteUrl,
  className,
  compact = false,
}: {
  state: DebateState;
  voteUrl: string;
  className?: string;
  compact?: boolean;
}) {
  const activeTopic = state.currentTopic ?? state.topics[0] ?? null;
  const tally = state.finalResult ?? state.liveCounts;
  const title = activeTopic?.title ?? state.debate.title;
  const isFinalVote = state.hideLiveProgress && !state.finalResult;
  const isEnded = Boolean(state.finalResult && state.debate.status === 'ENDED');

  return (
    <Panel className={`stage-board ${compact ? 'stage-board--compact' : ''} ${className ?? ''}`} as="section">
      <div className="stage-board__top">
        <div className="stage-board__brand">
          <Badge tone={isEnded ? 'success' : isFinalVote ? 'warn' : 'hot'}>{getStageLabel(state)}</Badge>
          <h2>{state.debate.title}</h2>
          <p>{state.debate.theme}</p>
        </div>

        <div className="stage-board__meta">
          <Badge tone={state.debate.status === 'ENDED' ? 'success' : state.debate.status === 'FINAL' ? 'warn' : 'neutral'}>
            {getStatusLabel(state.debate.status)}
          </Badge>
          <span>{state.topics.length} 个辩题</span>
          <span>{tally ? `${tally.total} 张票` : '等待投票'}</span>
        </div>
      </div>

      <div className="stage-board__tabs" aria-label="辩题列表">
        {state.topics.map((topic) => (
          <span
            key={topic.id}
            className={`stage-board__tab ${topic.id === activeTopic?.id ? 'stage-board__tab--active' : ''}`}
          >
            辩题 {topic.position + 1}
          </span>
        ))}
      </div>

      <div className="stage-board__title">
        <h3>{title}</h3>
        {state.currentRound === 'FINAL' && !isEnded ? <p>终局投票中，公屏只保留投票入口。</p> : null}
      </div>

      {!isFinalVote && activeTopic ? (
        <div className="stage-board__speech-grid">
          <article className="speech-card speech-card--pro">
            <span className="speech-card__badge">正方观点</span>
            <p>{activeTopic.proView}</p>
          </article>

          <div className="stage-board__qr">
            <QRCodeCard url={voteUrl} label="扫码投票" />
          </div>

          <article className="speech-card speech-card--con">
            <span className="speech-card__badge">反方观点</span>
            <p>{activeTopic.conView}</p>
          </article>
        </div>
      ) : (
        <div className="stage-board__final">
          <div className="stage-board__final-copy">
            <span className="stage-board__final-kicker">
              {isEnded ? '终局已完成' : '终局投票已开启'}
            </span>
            <h3>{isEnded ? '结果已生成' : '现在只保留扫码入口'}</h3>
            <p>
              {isEnded
                ? state.debate.finalSummary ?? '结果已计算完毕。'
                : '这一步不展示实时票数，等待观众完成最终投票后再生成结论。'}
            </p>
          </div>

          <div className="stage-board__qr stage-board__qr--center">
            <QRCodeCard url={voteUrl} label="扫码投票" />
          </div>
        </div>
      )}

      {tally && !state.hideLiveProgress ? <ProgressBar tally={tally} /> : null}

      {isEnded && state.finalResult ? (
        <div className="stage-board__result">
          <span>{state.finalResult.winner === 'TIE' ? '平局' : state.finalResult.winner === 'PRO' ? '正方胜利' : '反方胜利'}</span>
          <strong>
            正方 {state.finalResult.pro} 票 · 反方 {state.finalResult.con} 票
          </strong>
        </div>
      ) : null}
    </Panel>
  );
}
