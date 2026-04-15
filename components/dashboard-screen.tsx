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
  title: `辩题 ${position + 1}`,
  detail: '补充这一轮的讨论边界、评判标准和现场表达重点。',
  proView: '正方主张先从效率、可达性和现场体验来论证这一点。',
  conView: '反方主张先从边界、成本和风险来说明这一点仍有争议。',
  position,
});

const starterTopic = (): TopicForm => ({
  title: '起始辩题',
  detail: '这是系统自动附带的起始辩题，创建后可以继续修改、补充或新增。',
  proView: '正方主张先从效率、可达性和现场体验来论证这一点。',
  conView: '反方主张先从边界、成本和风险来说明这一点仍有争议。',
  position: 0,
});

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
        <Badge tone="neutral">辩题编辑</Badge>
        <h3>先选择一个辩题。</h3>
        <p>从上方列表选一个辩题后，这里会显示它的详细内容和操作按钮。</p>
      </Panel>
    );
  }

  const locked = state?.status === 'FINAL' || state?.status === 'ENDED';
  const summaryLabel = getMiniLabel(state, topic.id);

  return (
    <Panel className={`topic-editor ${active ? 'topic-editor--active' : ''}`}>
      <div className="topic-editor__header">
        <div>
          <Badge tone={active ? 'hot' : 'neutral'}>{active ? '当前辩题' : `辩题 ${topic.position + 1}`}</Badge>
          <h3>{topic.title || `辩题 ${topic.position + 1}`}</h3>
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
          label="辩题标题"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
          placeholder="输入这一轮的辩题"
          disabled={locked || busy}
        />
        <TextAreaField
          label="背景与说明"
          value={draft.detail}
          onChange={(event) => setDraft((previous) => ({ ...previous, detail: event.target.value }))}
          rows={4}
          placeholder="补充辩题边界、适用场景和评判标准"
          disabled={locked || busy}
        />
        <TextAreaField
          label="正方观点"
          value={draft.proView}
          onChange={(event) => setDraft((previous) => ({ ...previous, proView: event.target.value }))}
          rows={4}
          placeholder="正方如何开场，核心立场是什么"
          disabled={locked || busy}
        />
        <TextAreaField
          label="反方观点"
          value={draft.conView}
          onChange={(event) => setDraft((previous) => ({ ...previous, conView: event.target.value }))}
          rows={4}
          placeholder="反方如何反驳，核心攻防点是什么"
          disabled={locked || busy}
        />
      </div>

      <div className="topic-editor__actions">
        <Button
          variant="outline"
          onClick={() => void onSelect(topic.id)}
          disabled={busy}
        >
          选中该辩题
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
          <Badge tone="success">新增辩题</Badge>
          <h3>继续扩展这场辩论会。</h3>
        </div>
      </div>

      <div className="topic-editor__grid">
        <TextField
          label="标题"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
          disabled={disabled}
        />
        <TextAreaField
          label="介绍"
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
          添加辩题
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
        title: newTitle.trim() || '新辩论会',
        theme: newTheme.trim() || '请补充辩论主线。',
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
    setShareNotice('辩论会已创建。');
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
    setShareNotice('已切换到终局投票。');
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
    setShareNotice('当前轮投票已清空。');
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
          <h1>编排辩论会，控制辩题流转，监看实时投票。</h1>
          <p>
            这是一个偏操作台风格的工作区。你可以先新建辩论会，再逐题补全观点、切换当前辩题，最后把观众带入终局投票。
          </p>
        </div>
        <div className="dashboard-screen__hero-meta">
          <Badge tone={state ? (state.status === 'ENDED' ? 'success' : state.status === 'FINAL' ? 'warn' : 'neutral') : 'neutral'}>
            {state ? getStatusLabel(state.status) : '等待创建'}
          </Badge>
          <span>{items.length} 场辩论会</span>
          <span>{topicCount} 个辩题</span>
          <span>{state ? state.publicToken : '尚未选择'}</span>
        </div>
      </section>

      <section className="dashboard-screen__create panel">
        <div className="section-heading">
          <div>
            <span>新建辩论会</span>
            <p>创建时会自动带一个起始辩题，之后仍然可以继续添加和修改。</p>
          </div>
        </div>

        <div className="dashboard-screen__create-grid">
          <TextField
            label="辩论会名称"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="例如：年度思辨夜"
          />
          <TextField
            label="主题 / 主线"
            value={newTheme}
            onChange={(event) => setNewTheme(event.target.value)}
            placeholder="例如：AI 是否应该成为学习默认助手"
          />
        </div>

        <div className="dashboard-screen__create-actions">
          <Button onClick={() => void createDebate()} disabled={busyAction === 'create'}>
            {busyAction === 'create' ? '创建中…' : '创建辩论会'}
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
                <span>辩论会列表</span>
                <p>切换不同辩论会，右侧配置和舞台预览会同步更新。</p>
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
                    {item.topicCount} 个辩题 · {item.publicToken}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel className="dashboard-screen__panel">
            <div className="section-heading">
              <div>
                <span>共享链接</span>
                <p>这两个链接发给现场屏幕和扫码观众。</p>
              </div>
            </div>

            {selectedSummary ? (
              <div className="share-links">
                <div className="share-links__item">
                  <div className="share-links__copy">
                    <strong>公屏地址</strong>
                    <span>{stageUrl}</span>
                  </div>
                  <div className="share-links__actions">
                    <Link href={stageUrl} className="ui-button ui-button--outline ui-button--sm">
                      打开
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyLink('stage', stageUrl, '公屏地址')}
                      disabled={copiedLink === 'stage'}
                    >
                      {copiedLink === 'stage' ? '已复制' : '复制'}
                    </Button>
                  </div>
                </div>
                <div className="share-links__item">
                  <div className="share-links__copy">
                    <strong>投票地址</strong>
                    <span>{voteUrl}</span>
                  </div>
                  <div className="share-links__actions">
                    <Link href={voteUrl} className="ui-button ui-button--outline ui-button--sm">
                      打开
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyLink('vote', voteUrl, '投票地址')}
                      disabled={copiedLink === 'vote'}
                    >
                      {copiedLink === 'vote' ? '已复制' : '复制'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="dashboard-screen__empty">还没有辩论会，先创建一个吧。</p>
            )}
          </Panel>
        </aside>

        <section className="dashboard-screen__workspace">
          {state && selectedSummary ? (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--editor">
              <div className="section-heading section-heading--row">
                <div>
                  <span>辩论会编辑器</span>
                  <p>标题、主线和辩题内容都可以直接在这里改。</p>
                </div>
                <div className="section-heading__actions">
                  <Button
                    variant="outline"
                    onClick={() => void enterFinalVote()}
                    disabled={state.status === 'FINAL' || state.status === 'ENDED'}
                  >
                    进入终局投票
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
                  label="辩论会名称"
                  value={state.title}
                  onChange={(event) =>
                    void updateDebateTitle(state.id, event.target.value)
                  }
                  disabled={!canEdit}
                />
                <TextField
                  label="主题 / 主线"
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
                  添加辩题
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
              <Badge tone="warn">空工作区</Badge>
              <h2>创建第一场辩论会，开始试试后端。</h2>
              <p>这套页面会真正写入数据库，注册、登录、建题和投票都会走 API。</p>
            </Panel>
          )}
        </section>

        <aside className="dashboard-screen__monitor">
          {state && selectedSummary ? (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--stage">
              <div className="section-heading">
                <div>
                  <span>公屏预览</span>
                  <p>你可以把这里当作现场大屏的缩略镜像。</p>
                </div>
              </div>

              <QRCodeCard url={voteUrl} label="扫码投票" className="monitor-qr" />

              <div className="monitor-copy">
                <strong>{state.title}</strong>
                <p>{state.theme}</p>
              </div>

              <div className="monitor-stats">
                <div>
                  <span>当前模式</span>
                  <strong>{getStatusLabel(state.status)}</strong>
                </div>
                <div>
                  <span>当前辩题</span>
                  <strong>{activeTopic?.title ?? '终局投票'}</strong>
                </div>
                <div>
                  <span>{isFinalVote ? '终局状态' : '实时票数'}</span>
                  <strong>
                    {isFinalVote ? '已隐藏' : `${liveSummary.pro} / ${liveSummary.con}`}
                  </strong>
                </div>
              </div>

              {isFinalVote ? (
                <div className="monitor-final-hint">
                  <strong>终局投票中</strong>
                  <p>后台也不显示实时进度，等观众投完后直接点生成结果。</p>
                </div>
              ) : null}

              <div className="monitor-actions">
                <Button
                  onClick={() => void finalizeDebate()}
                  disabled={state.status !== 'FINAL' || busyAction !== null}
                >
                  生成最终结果
                </Button>
                <Button variant="outline" onClick={() => setSelectedId(state.id)}>
                  固定当前辩论会
                </Button>
              </div>

              {state.status === 'ENDED' ? (
                <div className="winner-banner">
                  <span>最终结果</span>
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
                  <span>终局结果</span>
                  <strong>{state.status === 'FINAL' ? '等待生成' : '尚未进入终局'}</strong>
                  <p>{state.status === 'FINAL' ? '进入终局投票后，先让观众扫码，再点生成按钮。' : '完成所有辩题后，才能切换到终局投票。'}</p>
                </div>
              )}
            </Panel>
          ) : (
            <Panel className="dashboard-screen__panel dashboard-screen__panel--stage">
              <Badge tone="neutral">公屏预览</Badge>
              <h3>还没有选择辩论会。</h3>
              <p>先创建一个辩论会，右侧就会出现舞台和二维码。</p>
            </Panel>
          )}
        </aside>
      </section>

      <Dialog
        open={clearDialogOpen}
        title="清空全部投票？"
        description="这会清除当前辩论会的所有实时票数和终局票数，适合在下一轮前重置。"
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
