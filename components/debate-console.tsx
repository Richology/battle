'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { DebateRecord, DebateState, DebateTopicRecord } from '@/lib/debate';

import { Badge, Button, Dialog, Panel, TextAreaField, TextField } from './ui';
import { StageBoard } from './stage-board';

type DebateSummary = {
  id: string;
  publicToken: string;
  title: string;
  theme: string;
  status: DebateRecord['status'];
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

type TopicForm = {
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position: number;
};

const emptyTopic = (position = 0): TopicForm => ({
  title: '',
  detail: '',
  proView: '',
  conView: '',
  position,
});

function getStatusLabel(status: DebateRecord['status']) {
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

function toTopicForm(topic: DebateTopicRecord | null | undefined, fallbackPosition = 0): TopicForm {
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

async function parseError(response: Response) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? '请求失败';
}

function CreateDebateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (debate: DebateSummary) => void;
}) {
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [topics, setTopics] = useState<TopicForm[]>([emptyTopic(0)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTopic(index: number, patch: Partial<TopicForm>) {
    setTopics((previous) =>
      previous.map((topic, topicIndex) => (topicIndex === index ? { ...topic, ...patch } : topic)),
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const response = await fetch('/api/debates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        theme,
        topics,
      }),
    });

    if (!response.ok) {
      setError(await parseError(response));
      setBusy(false);
      return;
    }

    const payload = (await response.json()) as { debate: DebateSummary };
    onCreated(payload.debate);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <Panel
        as="section"
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-label="新建辩论会"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-shell__header">
          <div>
            <Badge tone="hot">新建辩论会</Badge>
            <h2>先把标题、主线和至少一个辩题填好。</h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="modal-shell__grid">
          <TextField
            label="辩论会名称"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：年度思辨夜"
          />
          <TextField
            label="主线 / 主题"
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            placeholder="例如：AI 是否应该默认进入学习流程"
          />
        </div>

        <div className="topic-drafts">
          {topics.map((topic, index) => (
            <article className="topic-draft" key={index}>
              <div className="topic-draft__header">
                <h3>辩题 {index + 1}</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTopics((previous) => previous.length === 1 ? previous : previous.filter((_, itemIndex) => itemIndex !== index))}
                  disabled={topics.length === 1}
                >
                  删除
                </Button>
              </div>

              <div className="topic-draft__grid">
                <TextField
                  label="标题"
                  value={topic.title}
                  onChange={(event) => updateTopic(index, { title: event.target.value })}
                  placeholder="例如：AI 是否会让学习失去深度"
                />
                <TextAreaField
                  label="详细介绍"
                  value={topic.detail}
                  onChange={(event) => updateTopic(index, { detail: event.target.value })}
                  rows={4}
                  placeholder="补充边界、场景和辩论判准"
                />
                <TextAreaField
                  label="正方观点"
                  value={topic.proView}
                  onChange={(event) => updateTopic(index, { proView: event.target.value })}
                  rows={4}
                  placeholder="正方如何立论"
                />
                <TextAreaField
                  label="反方观点"
                  value={topic.conView}
                  onChange={(event) => updateTopic(index, { conView: event.target.value })}
                  rows={4}
                  placeholder="反方如何反驳"
                />
              </div>
            </article>
          ))}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-shell__actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTopics((previous) => [...previous, emptyTopic(previous.length)])}
          >
            再加一个辩题
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? '创建中…' : '创建辩论会'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function TopicEditor({
  topic,
  status,
  active,
  onSelect,
  onSave,
  onActivate,
  onDelete,
}: {
  topic: DebateTopicRecord | null;
  status: DebateRecord['status'];
  active: boolean;
  onSelect: (topicId: string) => void;
  onSave: (topicId: string, patch: Partial<TopicForm>) => Promise<void>;
  onActivate: (topicId: string) => Promise<void>;
  onDelete: (topicId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TopicForm>(toTopicForm(topic));

  useEffect(() => {
    setDraft(toTopicForm(topic));
  }, [topic]);

  if (!topic) {
    return (
      <Panel className="console-card console-card--empty">
        <Badge tone="neutral">辩题编辑</Badge>
        <h3>先选择一个辩题。</h3>
        <p>从上方列表选一个辩题后，这里会显示它的详细内容和操作按钮。</p>
      </Panel>
    );
  }

  return (
    <Panel className={`console-card console-card--topic ${active ? 'console-card--active' : ''}`}>
      <div className="console-card__header">
        <div>
          <Badge tone={active ? 'hot' : 'neutral'}>{active ? '当前辩题' : `辩题 ${topic.position + 1}`}</Badge>
          <h3>{topic.title}</h3>
        </div>
        <div className="console-card__actions">
          <Button
            size="sm"
            variant={active ? 'solid' : 'outline'}
            onClick={() => void onActivate(topic.id)}
            disabled={status === 'FINAL' || status === 'ENDED'}
          >
            设为当前
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void onDelete(topic.id)}
            disabled={status === 'FINAL' || status === 'ENDED'}
          >
            删除
          </Button>
        </div>
      </div>

      <div className="console-card__grid">
        <TextField
          label="标题"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
        />
        <TextAreaField
          label="介绍"
          value={draft.detail}
          onChange={(event) => setDraft((previous) => ({ ...previous, detail: event.target.value }))}
          rows={3}
        />
        <TextAreaField
          label="正方观点"
          value={draft.proView}
          onChange={(event) => setDraft((previous) => ({ ...previous, proView: event.target.value }))}
          rows={3}
        />
        <TextAreaField
          label="反方观点"
          value={draft.conView}
          onChange={(event) => setDraft((previous) => ({ ...previous, conView: event.target.value }))}
          rows={3}
        />
      </div>

      <div className="console-card__footer">
        <Button
          variant="outline"
          onClick={() => void onSelect(topic.id)}
        >
          选中该辩题
        </Button>
        <Button
          onClick={() => void onSave(topic.id, draft)}
          disabled={status === 'FINAL' || status === 'ENDED'}
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
    <Panel className="console-card console-card--new-topic">
      <div className="console-card__header">
        <div>
          <Badge tone="success">新增辩题</Badge>
          <h3>继续扩展这场辩论会。</h3>
        </div>
      </div>

      <div className="console-card__grid">
        <TextField
          label="标题"
          value={draft.title}
          onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
        />
        <TextAreaField
          label="介绍"
          value={draft.detail}
          onChange={(event) => setDraft((previous) => ({ ...previous, detail: event.target.value }))}
          rows={3}
        />
        <TextAreaField
          label="正方观点"
          value={draft.proView}
          onChange={(event) => setDraft((previous) => ({ ...previous, proView: event.target.value }))}
          rows={3}
        />
        <TextAreaField
          label="反方观点"
          value={draft.conView}
          onChange={(event) => setDraft((previous) => ({ ...previous, conView: event.target.value }))}
          rows={3}
        />
      </div>

      <div className="console-card__footer">
        <Button
          onClick={() => void onCreate(draft)}
          disabled={disabled}
        >
          添加辩题
        </Button>
      </div>
    </Panel>
  );
}

export function DebateConsole({
  userEmail,
  debates,
  initialState,
}: {
  userEmail: string;
  debates: DebateSummary[];
  initialState: DebateState | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DebateSummary[]>(debates);
  const [selectedId, setSelectedId] = useState<string>(initialState?.debate.id ?? debates[0]?.id ?? '');
  const [state, setState] = useState<DebateState | null>(initialState);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(
    initialState?.currentTopic?.id ?? initialState?.topics[0]?.id ?? null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [topicListError, setTopicListError] = useState<string | null>(null);

  const selectedSummary = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const activeTopicId = state?.currentTopic?.id ?? state?.topics[0]?.id ?? null;
  const selectedTopic = state?.topics.find((topic) => topic.id === selectedTopicId) ?? state?.currentTopic ?? null;

  async function refreshDebates() {
    const response = await fetch('/api/debates', { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { debates: DebateSummary[] };
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

    const payload = (await response.json()) as { debate: DebateState };
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

    const nextSelected = state.topics.find((topic) => topic.id === selectedTopicId);
    if (!nextSelected) {
      setSelectedTopicId(state.currentTopic?.id ?? state.topics[0]?.id ?? null);
    }
  }, [selectedTopicId, state]);

  async function selectDebate(debateId: string) {
    setSelectedId(debateId);
    setBusyAction(null);
    setShareNotice(null);
    await refreshState(debateId);
  }

  async function createDebate(input: { title: string; theme: string; topics: TopicForm[] }) {
    setBusyAction('create');
    const response = await fetch('/api/debates', {
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

    const payload = (await response.json()) as {
      debate: DebateSummary & {
        topics: DebateTopicRecord[];
        currentTopic: DebateTopicRecord | null;
      };
    };

    await refreshDebates();
    setSelectedId(payload.debate.id);
    await refreshState(payload.debate.id);
    setCreateOpen(false);
    setBusyAction(null);
    setShareNotice('辩论会已创建。');
  }

  async function updateTopic(topicId: string, patch: Partial<TopicForm>) {
    if (!state) {
      return;
    }

    setBusyAction(`topic:${topicId}`);
    const response = await fetch(`/api/debates/${state.debate.id}/topics/${topicId}`, {
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
    const response = await fetch(`/api/debates/${state.debate.id}/topics`, {
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
    const response = await fetch(`/api/debates/${state.debate.id}/current-topic`, {
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

  async function enterFinalRound() {
    if (!state) {
      return;
    }

    setBusyAction('final-round');
    const response = await fetch(`/api/debates/${state.debate.id}/final-round`, {
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
  }

  async function clearVotes() {
    if (!state) {
      return;
    }

    setConfirmClearOpen(false);
    setBusyAction('clear-votes');
    const response = await fetch(`/api/debates/${state.debate.id}/votes/reset`, {
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
    const response = await fetch(`/api/debates/${state.debate.id}/finalize`, {
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

    const response = await fetch(`/api/debates/${state.debate.id}/topics/${topicId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setTopicListError(await parseError(response));
      return;
    }

    await refreshState();
    await refreshDebates();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const stageUrl = selectedSummary ? `/stage/${selectedSummary.publicToken}` : '#';
  const voteUrl = selectedSummary ? `/vote/${selectedSummary.publicToken}` : '#';

  return (
    <main className="dashboard-console">
      <header className="dashboard-console__topbar">
        <div>
          <Badge tone="hot">辩论会控制台</Badge>
          <h1>邮箱登录、辩题编排、扫码投票、终局结算。</h1>
          <p>{userEmail}</p>
        </div>
        <div className="dashboard-console__topbar-actions">
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            新建辩论会
          </Button>
          <Button variant="ghost" onClick={() => void logout()}>
            退出登录
          </Button>
        </div>
      </header>

      {shareNotice ? (
        <Panel className="dashboard-console__notice">
          <strong>{shareNotice}</strong>
        </Panel>
      ) : null}

      <div className="dashboard-console__grid">
        <aside className="dashboard-console__rail">
          <Panel className="dashboard-console__panel">
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

          <Panel className="dashboard-console__panel">
            <div className="section-heading">
              <div>
                <span>共享地址</span>
                <p>这两个链接发给现场屏幕和扫码观众。</p>
              </div>
            </div>

            {selectedSummary ? (
              <div className="share-links">
                <Link href={stageUrl} className="share-links__item">
                  <strong>公屏地址</strong>
                  <span>{stageUrl}</span>
                </Link>
                <Link href={voteUrl} className="share-links__item">
                  <strong>投票地址</strong>
                  <span>{voteUrl}</span>
                </Link>
              </div>
            ) : (
              <p className="dashboard-console__empty">还没有辩论会，先创建一个吧。</p>
            )}
          </Panel>
        </aside>

        <section className="dashboard-console__stage">
          {state && selectedSummary ? (
            <StageBoard state={state} voteUrl={voteUrl} />
          ) : (
            <Panel className="dashboard-console__empty-state">
              <Badge tone="warn">空工作区</Badge>
              <h2>创建第一场辩论会，开始试试后端。</h2>
              <p>这套页面会真正写入 SQLite 数据库，注册、登录、建题和投票都会走 API。</p>
            </Panel>
          )}
        </section>

        <aside className="dashboard-console__inspector">
          {state && selectedSummary ? (
            <>
              <Panel className="console-card console-card--summary">
                <Badge tone="neutral">{getStatusLabel(state.debate.status)}</Badge>
                <h3>{state.debate.title}</h3>
                <p>{state.debate.theme}</p>
                <div className="console-card__mini">
                  <span>{state.topics.length} 个辩题</span>
                  <span>{state.currentRound === 'FINAL' ? '终局投票中' : '实时投票中'}</span>
                </div>
              </Panel>

              <Panel className="console-card console-card--topic-list">
                <div className="section-heading">
                  <div>
                    <span>当前辩题</span>
                    <p>切换当前辩题后，公屏二维码不变，票数会按新题统计。</p>
                  </div>
                </div>
                <div className="topic-pills">
                  {state.topics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className={`topic-pill ${topic.id === activeTopicId ? 'topic-pill--active' : ''}`}
                      onClick={() => setSelectedTopicId(topic.id)}
                    >
                      {topic.position + 1}
                    </button>
                  ))}
                </div>
                {topicListError ? <p className="form-error">{topicListError}</p> : null}
              </Panel>

              <TopicEditor
                key={selectedTopic?.id ?? 'none'}
                topic={selectedTopic}
                status={state.debate.status}
                active={selectedTopic?.id === state.debate.currentTopicId}
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

              <NewTopicEditor
                nextPosition={state.topics.length}
                onCreate={createTopic}
                disabled={busyAction !== null}
              />

              <Panel className="console-card console-card--actions">
                <div className="section-heading">
                  <div>
                    <span>流程控制</span>
                    <p>清票会弹窗确认，终局结果只在主持人点击后生成。</p>
                  </div>
                </div>

                <div className="action-stack">
                  <Button
                    variant="outline"
                    onClick={() => void enterFinalRound()}
                    disabled={state.debate.status === 'FINAL' || state.debate.status === 'ENDED'}
                  >
                    进入终局投票
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmClearOpen(true)}>
                    清空当前投票
                  </Button>
                  <Button
                    variant="solid"
                    onClick={() => void finalizeDebate()}
                    disabled={state.debate.status !== 'FINAL'}
                  >
                    生成最终结果
                  </Button>
                </div>
              </Panel>
            </>
          ) : (
            <Panel className="console-card console-card--empty">
              <Badge tone="neutral">控制面板</Badge>
              <h3>先创建辩论会。</h3>
              <p>创建后这里会显示辩题编辑、流程控制和清票按钮。</p>
            </Panel>
          )}
        </aside>
      </div>

      {createOpen ? (
        <CreateDebateModal
          onClose={() => setCreateOpen(false)}
          onCreated={async (debate) => {
            await refreshDebates();
            setSelectedId(debate.id);
            await refreshState(debate.id);
            setCreateOpen(false);
          }}
        />
      ) : null}

      <Dialog
        open={confirmClearOpen}
        title="清空当前投票？"
        description="这会删除当前辩题或终局轮的全部投票记录，清空后无法恢复。"
        confirmLabel="确认清空"
        tone="danger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => void clearVotes()}
      />
    </main>
  );
}
