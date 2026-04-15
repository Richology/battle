'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Badge, Button, Dialog, Panel, TextAreaField, TextField } from './ui';
import { QRCodeCard } from './qr-code';

type DebateStatus = 'DRAFT' | 'LIVE' | 'FINAL' | 'ENDED';
type VoteSide = 'PRO' | 'CON';

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

export type DashboardDebateSummary = {
  id: string;
  publicToken: string;
  title: string;
  theme: string;
  status: DebateStatus;
  currentTopicId: string | null;
  currentTopic: {
    id: string;
    title: string;
  } | null;
  topicCount: number;
  stagePath: string;
  votePath: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardDebateState = {
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

type TopicForm = {
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position: number;
};

const emptyTopic = (position = 0): TopicForm => ({
  title: `第 ${position + 1} 题`,
  detail: '补充这一轮要讨论什么、判断标准是什么，以及现场要聚焦哪些观点。',
  proView: '正方可以先从效率、可达性和现场体验来展开。',
  conView: '反方可以先从边界、成本和风险来展开。',
  position,
});

const starterTopic = (): TopicForm => ({
  title: '第一题',
  detail: '这是系统先准备好的第一题，创建后可以继续修改、补充或新增。',
  proView: '正方可以先从效率、可达性和现场体验来展开。',
  conView: '反方可以先从边界、成本和风险来展开。',
  position: 0,
});

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

function toTopicForm(topic: TopicRecord | null | undefined, fallbackPosition = 0): TopicForm {
  if (!topic) {
    return emptyTopic(fallbackPosition);
  }

  return {
    title: topic.title,
    detail: topic.detail,
    proView: topic.proView,
    conView: topic.conView,
    position: topic.position,
  };
}

function getMiniLabel(state: DashboardDebateState | null, topicId: string) {
  if (!state) {
    return '—';
  }

  if (state.finalResult && state.status === 'ENDED') {
    return `${state.finalResult.pro} : ${state.finalResult.con}`;
  }

  if (state.currentRound === 'TOPIC' && state.currentTopicId === topicId && state.liveCounts) {
    return `${state.liveCounts.pro} : ${state.liveCounts.con}`;
  }

  return '—';
}

async function parseError(response: Response) {
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

function TopicEditor({
  topic,
  state,
  active,
  busy,
  canDelete,
  onSelect,
  onSave,
  onActivate,
  onDelete,
}: {
  topic: TopicRecord | null;
  state: DashboardDebateState | null;
  active: boolean;
  busy: boolean;
  canDelete: boolean;
  onSelect: (topicId: string) => void;
  onSave: (topicId: string, patch: Partial<TopicForm>) => Promise<void>;
  onActivate: (topicId: string) => Promise<void>;
  onDelete: (topicId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TopicForm>(() => toTopicForm(topic));

  useEffect(() => {
    setDraft(toTopicForm(topic));
  }, [topic]);

  if (!topic) {
    return (
      <Panel className="topic-editor topic-editor--empty">
        <Badge tone="neutral">题目编辑</Badge>
        <h3>先选择一道题目。</h3>
        <p>从上方列表选中之后，这里会显示题目详情和编辑按钮。</p>
      </Panel>
    );
  }

  const locked = state?.status === 'FINAL' || state?.status === 'ENDED';
  const summaryLabel = getMiniLabel(state, topic.id);

  return (
    <Panel className={`topic-editor ${active ? 'topic-editor--active' : ''}`}>
      <div className="topic-editor__header">
        <div>
          <Badge tone={active ? 'hot' : 'neutral'}>{active ? '当前题目' : `第 ${topic.position + 1} 题`}</Badge>
          <h3>{topic.title || `第 ${topic.position + 1} 题`}</h3>
        </div>
        <div className="topic-editor__mini">
          <span>{summaryLabel}</span>
          <Button
            variant={active ? 'solid' : 'outline'}
            size="sm"
            onClick={() => void onActivate(topic.id)}
            disabled={locked || busy}
          >
            设为当前
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onDelete(topic.id)}
            disabled={locked || busy || !canDelete}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="topic-editor__grid">
        <TextField
          label="题目名称"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
          placeholder="输入这一轮的题目名称"
          disabled={locked || busy}
        />
        <TextAreaField
          label="题目说明"
          value={draft.detail}
          onChange={(event) => setDraft((previous) => ({ ...previous, detail: event.target.value }))}
          rows={4}
          placeholder="补充边界、场景和判断标准"
          disabled={locked || busy}
        />
        <TextAreaField
          label="正方观点"
          value={draft.proView}
          onChange={(event) => setDraft((previous) => ({ ...previous, proView: event.target.value }))}
          rows={4}
          placeholder="正方怎么说，核心立场是什么"
          disabled={locked || busy}
        />
        <TextAreaField
          label="反方观点"
          value={draft.conView}
          onChange={(event) => setDraft((previous) => ({ ...previous, conView: event.target.value }))}
          rows={4}
          placeholder="反方怎么说，主要反驳点是什么"
          disabled={locked || busy}
        />
      </div>

      <div className="topic-editor__actions">
        <Button
          variant="outline"
          onClick={() => void onSelect(topic.id)}
          disabled={busy}
        >
          查看详情
        </Button>
        <Button
          onClick={() => void onSave(topic.id, draft)}
          disabled={locked || busy}
        >
          保存修改
        </Button>
      </div>
    </Panel>
  );
}

function NewTopicEditor({
  nextPosition,
  onCreate,
  disabled,
}: {
  nextPosition: number;
  onCreate: (topic: TopicForm) => Promise<void>;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<TopicForm>(() => emptyTopic(nextPosition));

  useEffect(() => {
    setDraft(emptyTopic(nextPosition));
  }, [nextPosition]);

  return (
    <Panel className="topic-editor topic-editor--new">
      <div className="topic-editor__header">
        <div>
          <Badge tone="success">新增题目</Badge>
          <h3>继续补充更多题目。</h3>
        </div>
      </div>

      <div className="topic-editor__grid">
        <TextField
          label="题目名称"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
          disabled={disabled}
        />
        <TextAreaField
          label="题目说明"
          value={draft.detail}
          onChange={(event) => setDraft((previous) => ({ ...previous, detail: event.target.value }))}
          rows={3}
          disabled={disabled}
        />
        <TextAreaField
          label="正方观点"
          value={draft.proView}
          onChange={(event) => setDraft((previous) => ({ ...previous, proView: event.target.value }))}
          rows={3}
          disabled={disabled}
        />
        <TextAreaField
          label="反方观点"
          value={draft.conView}
          onChange={(event) => setDraft((previous) => ({ ...previous, conView: event.target.value }))}
          rows={3}
          disabled={disabled}
        />
      </div>

      <div className="topic-editor__actions">
        <Button onClick={() => void onCreate(draft)} disabled={disabled}>
          添加题目
        </Button>
      </div>
    </Panel>
  );
}

const emptyVoteTally: VoteTally = {
  pro: 0,
  con: 0,
  total: 0,
  proPercent: 0,
  conPercent: 0,
  winner: null,
};

export function DashboardScreen({
  userEmail,
  debates,
  initialState,
}: {
  userEmail: string;
  debates: DashboardDebateSummary[];
  initialState: DashboardDebateState | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DashboardDebateSummary[]>(debates);
  const [state, setState] = useState<DashboardDebateState | null>(initialState);
  const [selectedId, setSelectedId] = useState<string>(initialState?.id ?? debates[0]?.id ?? '');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    initialState?.currentTopic?.id ?? initialState?.topics[0]?.id ?? null,
  );
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [topicListError, setTopicListError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<'stage' | 'vote' | null>(null);

  const selectedSummary = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const activeTopic = state?.currentTopic ?? state?.topics.find((topic) => topic.id === selectedTopicId) ?? null;
  const isFinalVote = Boolean(state && state.status === 'FINAL' && !state.finalResult);
  const liveSummary = state?.finalResult ?? state?.liveCounts ?? emptyVoteTally;
  const canEdit = Boolean(state && state.status !== 'FINAL' && state.status !== 'ENDED');
  const stageUrl = selectedSummary ? selectedSummary.stagePath : '#';
  const voteUrl = selectedSummary ? selectedSummary.votePath : '#';
  const activeStep =
    state?.status === 'ENDED' ? 4 : state?.status === 'FINAL' ? 3 : state?.status === 'LIVE' ? 2 : 1;

  useEffect(() => {
    if (!copiedLink) {
      return;
    }

    const timer = window.setTimeout(() => setCopiedLink(null), 1600);
    return () => window.clearTimeout(timer);
  }, [copiedLink]);

  async function refreshDebates() {
    const response = await fetch('/api/debates', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { debates: DashboardDebateSummary[] };
    setItems(payload.debates);
  }

  async function refreshState(debateId = selectedId) {
    if (!debateId) {
      setState(null);
      return;
    }

    const response = await fetch(`/api/debates/${debateId}`, { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { debate: DashboardDebateState };
    setState(payload.debate);
  }

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    void refreshState(selectedId);
    const timer = window.setInterval(() => void refreshState(selectedId), 2500);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!state) {
      return;
    }

    if (!state.topics.some((topic) => topic.id === selectedTopicId)) {
      setSelectedTopicId(state.currentTopic?.id ?? state.topics[0]?.id ?? null);
    }
  }, [selectedTopicId, state]);

  async function selectDebate(debateId: string) {
    setSelectedId(debateId);
    setBusyAction(null);
    setShareNotice(null);
    setCopiedLink(null);
    setTopicListError(null);
    await refreshState(debateId);
  }

  async function copyLink(kind: 'stage' | 'vote', value: string, label: string) {
    if (value === '#') {
      return;
    }

    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = value;
        fallback.setAttribute('readonly', 'true');
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        copied = document.execCommand('copy');
        document.body.removeChild(fallback);
      }
    } catch {
      copied = false;
    }

    if (copied) {
      setCopiedLink(kind);
      setShareNotice(`${label}已复制到剪贴板。`);
      return;
    }

    setCopiedLink(null);
    setShareNotice(`${label}复制失败，请手动复制。`);
  }

  async function createDebate() {
    setBusyAction('create');
    setTopicListError(null);

    const response = await fetch('/api/debates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: newTitle.trim() || '新活动',
        theme: newTheme.trim() || '请补充活动主题。',
        topics: [starterTopic()],
      }),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    const payload = (await response.json()) as { debate: DashboardDebateSummary };
    setNewTitle('');
    setNewTheme('');
    await refreshDebates();
    setSelectedId(payload.debate.id);
    await refreshState(payload.debate.id);
    setBusyAction(null);
    setShareNotice('活动已创建。');
  }

  async function updateTopic(topicId: string, patch: Partial<TopicForm>) {
    if (!state) {
      return;
    }

    setBusyAction(`topic:${topicId}`);
    const response = await fetch(`/api/debates/${state.id}/topics/${topicId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }

  async function createTopic(input: TopicForm) {
    if (!state) {
      return;
    }

    setBusyAction('add-topic');
    const response = await fetch(`/api/debates/${state.id}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }

  async function activateTopic(topicId: string) {
    if (!state) {
      return;
    }

    setBusyAction(`activate:${topicId}`);
    const response = await fetch(`/api/debates/${state.id}/current-topic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topicId }),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }

  async function enterFinalVote() {
    if (!state) {
      return;
    }

    setBusyAction('final-round');
    const response = await fetch(`/api/debates/${state.id}/final-round`, {
      method: 'POST',
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
    setShareNotice('已切换到终极投票。');
  }

  async function clearVotes() {
    if (!state) {
      return;
    }

    setClearDialogOpen(false);
    setBusyAction('clear-votes');
    const response = await fetch(`/api/debates/${state.id}/votes/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: true }),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    setBusyAction(null);
    setShareNotice('本轮投票已清空。');
  }

  async function finalizeDebate() {
    if (!state) {
      return;
    }

    setBusyAction('finalize');
    const response = await fetch(`/api/debates/${state.id}/finalize`, {
      method: 'POST',
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
    setShareNotice('最终结果已生成。');
  }

  async function deleteTopic(topicId: string) {
    if (!state) {
      return;
    }

    setBusyAction(`delete:${topicId}`);
    const response = await fetch(`/api/debates/${state.id}/topics/${topicId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const topicCount = state?.topics.length ?? 0;

  return (
    <main className="dashboard-screen page-shell">
      <section className="dashboard-screen__hero">
        <div>
          <Badge tone={state ? (state.status === 'ENDED' ? 'success' : state.status === 'FINAL' ? 'warn' : 'hot') : 'warn'}>
            已登录 · {userEmail}
          </Badge>
          <h1>创建活动、配置题目、分享现场页，投票结果一目了然。</h1>
          <p>
            先创建一场活动，再补充题目和双方观点，打开现场页给大屏，最后把投票结果生成出来。
          </p>
        </div>
        <div className="dashboard-screen__hero-meta">
          <Badge tone={state ? (state.status === 'ENDED' ? 'success' : state.status === 'FINAL' ? 'warn' : 'neutral') : 'neutral'}>
            {state ? getStatusLabel(state.status) : '等待开始'}
          </Badge>
          <span>{items.length} 场活动</span>
          <span>{topicCount} 个题目</span>
          <span>{state ? `分享码 ${state.publicToken}` : '暂无活动'}</span>
        </div>
      </section>

      <section className="dashboard-screen__flow">
        {[
          { step: 1, title: '创建活动', desc: '先定名称和主题' },
          { step: 2, title: '配置题目', desc: '补充正反观点' },
          { step: 3, title: '现场投票', desc: '开放扫码投票' },
          { step: 4, title: '生成结果', desc: '进入终局投票后出结果' },
        ].map((item) => (
          <div
            key={item.step}
            className={`flow-step ${item.step === activeStep ? 'flow-step--active' : ''} ${item.step < activeStep ? 'flow-step--done' : ''}`}
          >
            <span>0{item.step}</span>
            <strong>{item.title}</strong>
            <p>{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="dashboard-screen__create panel">
        <div className="section-heading">
          <div>
            <span>新建活动</span>
            <p>先填一个名称和主题，系统会自动带上第一道题，之后可以继续补充。</p>
          </div>
        </div>

        <div className="dashboard-screen__create-grid">
          <TextField
            label="活动名称"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="例如：今晚聊什么"
          />
          <TextField
            label="讨论主题"
            value={newTheme}
            onChange={(event) => setNewTheme(event.target.value)}
            placeholder="例如：AI 是否应该进入课堂"
          />
        </div>

        <div className="dashboard-screen__create-actions">
          <Button onClick={() => void createDebate()} disabled={busyAction === 'create'}>
            {busyAction === 'create' ? '创建中…' : '创建活动'}
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            退出登录
          </Button>
        </div>
      </section>

      {shareNotice ? (
        <Panel className="dashboard-screen__panel dashboard-screen__notice">
          <strong>{shareNotice}</strong>
        </Panel>
      ) : null}

      <section className="dashboard-screen__layout">
        <aside className="dashboard-screen__rail">
          <Panel className="dashboard-screen__panel">
            <div className="section-heading">
              <div>
                <span>活动列表</span>
                <p>切换不同活动，右侧内容和现场页会一起更新。</p>
              </div>
            </div>

            <div className="debate-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`debate-list__item ${item.id === selectedId ? 'debate-list__item--active' : ''}`}
                  onClick={() => void selectDebate(item.id)}
                >
                  <div className="debate-list__item-top">
                    <strong>{item.title}</strong>
                    <Badge tone={item.status === 'LIVE' ? 'success' : item.status === 'FINAL' ? 'warn' : 'neutral'}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                  <p>{item.theme}</p>
                  <span>
                    {item.topicCount} 个题目 · 分享码 {item.publicToken}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="dashboard-screen__panel">
            <div className="section-heading">
              <div>
                <span>分享链接</span>
                <p>把这两个链接发给大屏和观众，现场就能直接开始。</p>
              </div>
            </div>

            {selectedSummary ? (
              <div className="share-links">
              <div className="share-links__item">
                  <div className="share-links__copy">
                    <strong>现场页</strong>
                    <span>{stageUrl}</span>
                  </div>
                  <div className="share-links__actions">
                    <Link href={stageUrl} className="ui-button ui-button--outline ui-button--sm">
                      打开链接
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyLink('stage', stageUrl, '现场页')}
                      disabled={copiedLink === 'stage'}
                    >
                      {copiedLink === 'stage' ? '已复制' : '复制'}
                    </Button>
                  </div>
                </div>
              <div className="share-links__item">
                  <div className="share-links__copy">
                    <strong>投票页</strong>
                    <span>{voteUrl}</span>
                  </div>
                  <div className="share-links__actions">
                    <Link href={voteUrl} className="ui-button ui-button--outline ui-button--sm">
                      打开链接
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyLink('vote', voteUrl, '投票页')}
                      disabled={copiedLink === 'vote'}
                    >
                      {copiedLink === 'vote' ? '已复制' : '复制'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="dashboard-screen__empty">还没有活动，先创建一场吧。</p>
            )}
          </Panel>
        </aside>

        <section className="dashboard-screen__workspace">
          {state && selectedSummary ? (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--editor">
              <div className="section-heading section-heading--row">
                <div>
                  <span>活动设置</span>
                  <p>活动名称、主题和题目内容都可以直接在这里改。</p>
                </div>
                <div className="section-heading__actions">
                  <Button
                    variant="outline"
                    onClick={() => void enterFinalVote()}
                    disabled={state.status === 'FINAL' || state.status === 'ENDED'}
                  >
                    切换到终极投票
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setClearDialogOpen(true)}
                  >
                    清空投票
                  </Button>
                </div>
              </div>

              <div className="dashboard-screen__meta-grid">
                <TextField
                  label="活动名称"
                  value={state.title}
                  onChange={(event) =>
                    void updateDebateTitle(state.id, event.target.value)
                  }
                  disabled={!canEdit}
                />
                <TextField
                  label="讨论主题"
                  value={state.theme}
                  onChange={(event) =>
                    void updateDebateTheme(state.id, event.target.value)
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="topic-strip">
                {state.topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    className={`topic-strip__item ${topic.id === state.currentTopicId ? 'topic-strip__item--active' : ''}`}
                    onClick={() => void activateTopic(topic.id)}
                    disabled={!canEdit}
                  >
                    <span>#{topic.position + 1}</span>
                    <strong>{topic.title}</strong>
                  </button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => void createTopic(emptyTopic(state.topics.length))}
                  disabled={!canEdit || busyAction !== null}
                >
                  新增题目
                </Button>
              </div>

              {topicListError ? <p className="form-error">{topicListError}</p> : null}

              <div className="dashboard-screen__topics">
                {state.topics.map((topic) => (
                  <TopicEditor
                    key={topic.id}
                    topic={topic}
                    state={state}
                    active={topic.id === state.currentTopicId}
                    busy={busyAction !== null}
                    canDelete={state.topics.length > 1}
                    onSelect={(topicId) => setSelectedTopicId(topicId)}
                    onSave={async (topicId, patch) => {
                      await updateTopic(topicId, patch);
                    }}
                    onActivate={async (topicId) => {
                      await activateTopic(topicId);
                    }}
                    onDelete={async (topicId) => {
                      await deleteTopic(topicId);
                    }}
                  />
                ))}

                <NewTopicEditor
                  nextPosition={state.topics.length}
                  onCreate={createTopic}
                  disabled={!canEdit || busyAction !== null}
                />
              </div>
            </Panel>
          ) : (
            <Panel className="dashboard-screen__panel dashboard-screen__empty-state">
              <Badge tone="warn">还没有活动</Badge>
              <h2>创建第一场活动，开始完整体验。</h2>
              <p>从这里开始，你可以创建活动、补充题目、分享现场页，再把观众投票结果收回来。</p>
            </Panel>
          )}
        </section>

        <aside className="dashboard-screen__monitor">
          {state && selectedSummary ? (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--stage">
              <div className="section-heading">
                <div>
                  <span>现场预览</span>
                  <p>你可以把这里当作现场大屏的缩略图，方便检查展示效果。</p>
                </div>
              </div>

              <QRCodeCard url={voteUrl} label="扫码投票" className="monitor-qr" />

              <div className="monitor-copy">
                <strong>{state.title}</strong>
                <p>{state.theme}</p>
              </div>

              <div className="monitor-stats">
                <div>
                  <span>当前状态</span>
                  <strong>{getStatusLabel(state.status)}</strong>
                </div>
                <div>
                  <span>当前题目</span>
                  <strong>{activeTopic?.title ?? '终极投票'}</strong>
                </div>
                <div>
                  <span>{isFinalVote ? '终极状态' : '现场票数'}</span>
                  <strong>
                    {isFinalVote ? '已隐藏' : `${liveSummary.pro} / ${liveSummary.con}`}
                  </strong>
                </div>
              </div>

              {isFinalVote ? (
                <div className="monitor-final-hint">
                  <strong>终极投票中</strong>
                  <p>这一轮不显示实时票数，等观众投完后直接生成结果。</p>
                </div>
              ) : null}

              <div className="monitor-actions">
                <Button
                  onClick={() => void finalizeDebate()}
                  disabled={state.status !== 'FINAL' || busyAction !== null}
                >
                  生成结果
                </Button>
                <Button variant="outline" onClick={() => setSelectedId(state.id)}>
                  锁定当前活动
                </Button>
              </div>

              {state.status === 'ENDED' ? (
                <div className="winner-banner">
                  <span>结果公布</span>
                  <strong>
                    {state.finalWinner === 'PRO'
                      ? '正方胜出'
                      : state.finalWinner === 'CON'
                        ? '反方胜出'
                        : '平局'}
                  </strong>
                  <p>{state.finalSummary ?? '结果已生成。'}</p>
                </div>
              ) : (
                <div className="winner-banner winner-banner--muted">
                  <span>最后结果</span>
                  <strong>{state.status === 'FINAL' ? '等待生成' : '尚未进入终极投票'}</strong>
                  <p>{state.status === 'FINAL' ? '先让观众扫码完成最后一票，再点击生成结果。' : '完成所有题目后，才能切换到终极投票。'}</p>
                </div>
              )}
            </Panel>
          ) : (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--stage">
              <Badge tone="neutral">现场预览</Badge>
              <h3>还没有选择活动。</h3>
              <p>先创建一场活动，右侧就会出现现场页和二维码。</p>
            </Panel>
          )}
        </aside>
      </section>

      <Dialog
        open={clearDialogOpen}
        title="清空投票？"
        description="这会清掉当前活动的所有票数，适合重新开始一轮。"
        confirmLabel="确认清空"
        tone="danger"
        onCancel={() => setClearDialogOpen(false)}
        onConfirm={() => void clearVotes()}
      />
    </main>
  );

  async function updateDebateTitle(debateId: string, title: string) {
    if (!canEdit) {
      return;
    }

    setBusyAction('debate:title');
    const response = await fetch(`/api/debates/${debateId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }

  async function updateDebateTheme(debateId: string, theme: string) {
    if (!canEdit) {
      return;
    }

    setBusyAction('debate:theme');
    const response = await fetch(`/api/debates/${debateId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme }),
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      setBusyAction(null);
      return;
    }

    await refreshState();
    await refreshDebates();
    setBusyAction(null);
  }
}
