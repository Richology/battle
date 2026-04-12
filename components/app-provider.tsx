'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type VoteSide = 'PRO' | 'CON';
export type VoteRound = 'TOPIC' | 'FINAL';
export type DebateStatus = 'DRAFT' | 'LIVE' | 'FINAL' | 'ENDED';

export interface Topic {
  id: string;
  title: string;
  detail: string;
  proView: string;
  conView: string;
  position: number;
}

export interface Vote {
  id: string;
  debateId: string;
  topicId: string | null;
  round: VoteRound;
  side: VoteSide;
  voterKey: string;
  createdAt: string;
}

export interface Debate {
  id: string;
  publicToken: string;
  ownerEmail?: string | null;
  title: string;
  theme: string;
  status: DebateStatus;
  currentTopicId: string | null;
  finalWinner: VoteSide | null;
  finalSummary: string | null;
  createdAt: string;
  updatedAt: string;
  topics: Topic[];
  votes: Vote[];
}

interface Account {
  email: string;
  password: string;
  createdAt: string;
}

interface Session {
  email: string;
  token: string;
  createdAt: string;
}

interface WorkspaceState {
  session: Session | null;
  accounts: Account[];
  debates: Debate[];
  activeDebateId: string;
}

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface StoreValue {
  ready: boolean;
  state: WorkspaceState;
  session: Session | null;
  debates: Debate[];
  activeDebate: Debate;
  setActiveDebateId: (debateId: string) => void;
  createDebate: (input: { title: string; theme: string }) => Debate;
  updateDebate: (
    debateId: string,
    patch: Partial<Pick<Debate, 'title' | 'theme'>>,
  ) => void;
  addTopic: (
    debateId: string,
    input?: Partial<Pick<Topic, 'title' | 'detail' | 'proView' | 'conView'>>,
  ) => Topic | null;
  updateTopic: (
    debateId: string,
    topicId: string,
    patch: Partial<Pick<Topic, 'title' | 'detail' | 'proView' | 'conView'>>,
  ) => void;
  activateTopic: (debateId: string, topicId: string) => void;
  enterFinalVote: (debateId: string) => void;
  clearVotes: (debateId: string) => void;
  generateFinalResult: (debateId: string) => void;
  castVote: (
    debateToken: string,
    side: VoteSide,
    voterKey: string,
  ) => AuthResult;
  register: (email: string, password: string) => AuthResult;
  login: (email: string, password: string) => AuthResult;
  logout: () => void;
  getDebateByToken: (token: string) => Debate | undefined;
}

const STORAGE_KEY = 'battle-console-state-v1';
export const DEMO_DEBATE_TOKEN = 'demo-main';

const WorkspaceContext = createContext<StoreValue | null>(null);

function uid(prefix: string) {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 11);

  return `${prefix}_${random.replace(/-/g, '').slice(0, 12)}`;
}

function timestamp() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createTopic(position: number, overrides: Partial<Topic> = {}): Topic {
  return {
    id: overrides.id ?? uid('topic'),
    title: overrides.title ?? `辩题 ${position + 1}`,
    detail:
      overrides.detail ??
      '补充这一轮的讨论边界、评判标准和现场表达重点，让观众知道这一题为什么值得争论。',
    proView:
      overrides.proView ??
      '正方主张把这一点放在优先级更高的位置，并给出可被现场观众理解的论证。',
    conView:
      overrides.conView ??
      '反方强调风险、成本或替代方案，说明为什么这个判断还不够成立。',
    position,
  };
}

function createDebateDraft(input: {
  title: string;
  theme: string;
  publicToken?: string;
  status?: DebateStatus;
  ownerEmail?: string | null;
}): Debate {
  const topic = createTopic(0);

  return {
    id: uid('debate'),
    publicToken: input.publicToken ?? uid('token'),
    ownerEmail: input.ownerEmail ?? null,
    title: input.title.trim() || '新辩论会',
    theme: input.theme.trim() || '请补充辩论主题与判准。',
    status: input.status ?? 'DRAFT',
    currentTopicId: topic.id,
    finalWinner: null,
    finalSummary: null,
    createdAt: timestamp(),
    updatedAt: timestamp(),
    topics: [topic],
    votes: [],
  };
}

function createDemoState(): WorkspaceState {
  const first = createTopic(0, {
    id: 'topic-demo-1',
    title: 'AI 是学习增效器还是注意力分散器',
    detail:
      '围绕课堂、阅读和作业三个场景，判断 AI 到底是在降低门槛，还是在稀释深度思考。',
    proView:
      '正方认为 AI 能迅速补齐信息差，让学习过程更高效，也更适合个性化反馈。',
    conView:
      '反方认为过度依赖 AI 会削弱独立检索、推理和记忆的训练，让学习变成答案搬运。',
  });

  const second = createTopic(1, {
    id: 'topic-demo-2',
    title: '学校是否应把 AI 使用纳入评分体系',
    detail:
      '这轮讨论不只是“能不能用”，还要判断应该如何记录、审核和评价模型参与的学习行为。',
    proView:
      '正方认为透明记录 AI 参与过程，反而能让评分更真实地反映学生的理解能力。',
    conView:
      '反方认为一旦把 AI 直接纳入评分，教育就会把工具当成目标，带来新的形式主义。',
  });

  const votes: Vote[] = [
    { id: 'vote-demo-1', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'PRO', voterKey: 'alpha', createdAt: '2026-04-12T00:00:00.000Z' },
    { id: 'vote-demo-2', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'PRO', voterKey: 'beta', createdAt: '2026-04-12T00:01:00.000Z' },
    { id: 'vote-demo-3', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'CON', voterKey: 'gamma', createdAt: '2026-04-12T00:02:00.000Z' },
    { id: 'vote-demo-4', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'PRO', voterKey: 'delta', createdAt: '2026-04-12T00:03:00.000Z' },
    { id: 'vote-demo-5', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'CON', voterKey: 'epsilon', createdAt: '2026-04-12T00:04:00.000Z' },
    { id: 'vote-demo-6', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'PRO', voterKey: 'zeta', createdAt: '2026-04-12T00:05:00.000Z' },
    { id: 'vote-demo-7', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'CON', voterKey: 'eta', createdAt: '2026-04-12T00:06:00.000Z' },
    { id: 'vote-demo-8', debateId: 'debate-demo-main', topicId: first.id, round: 'TOPIC', side: 'PRO', voterKey: 'theta', createdAt: '2026-04-12T00:07:00.000Z' },
  ];

  const debate: Debate = {
    id: 'debate-demo-main',
    publicToken: DEMO_DEBATE_TOKEN,
    ownerEmail: null,
    title: '年度思辨夜',
    theme: '关于 AI 是否应该默认进入学习流程',
    status: 'LIVE',
    currentTopicId: first.id,
    finalWinner: null,
    finalSummary: null,
    createdAt: '2026-04-12T00:00:00.000Z',
    updatedAt: '2026-04-12T00:12:00.000Z',
    topics: [first, second],
    votes,
  };

  return {
    session: null,
    accounts: [],
    debates: [debate],
    activeDebateId: debate.id,
  };
}

function loadState(): WorkspaceState {
  if (typeof window === 'undefined') {
    return createDemoState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createDemoState();
  }

  try {
    const parsed = JSON.parse(raw) as WorkspaceState;
    if (!parsed?.debates?.length) {
      return createDemoState();
    }

    return parsed;
  } catch {
    return createDemoState();
  }
}

function summarizeVotes(votes: Vote[], round: VoteRound, topicId: string | null) {
  const filtered = votes.filter((vote) => {
    if (vote.round !== round) {
      return false;
    }

    return round === 'FINAL' ? true : vote.topicId === topicId;
  });

  const pro = filtered.filter((vote) => vote.side === 'PRO').length;
  const con = filtered.filter((vote) => vote.side === 'CON').length;
  const total = filtered.length;
  const proPercent = total ? Math.round((pro / total) * 100) : 0;
  const conPercent = total ? 100 - proPercent : 0;

  return { pro, con, total, proPercent, conPercent };
}

function getCurrentTopic(debate: Debate) {
  return debate.topics.find((topic) => topic.id === debate.currentTopicId) ?? debate.topics[0] ?? null;
}

export function getVoteScope(debate: Debate) {
  return debate.status === 'FINAL' || debate.status === 'ENDED' ? 'FINAL' : 'TOPIC';
}

export function getVoteSummary(debate: Debate) {
  const scope = getVoteScope(debate);
  const topicId = scope === 'TOPIC' ? getCurrentTopic(debate)?.id ?? null : null;

  return summarizeVotes(debate.votes, scope, topicId);
}

export function getTopicVoteSummary(debate: Debate, topicId: string | null) {
  return summarizeVotes(debate.votes, 'TOPIC', topicId);
}

export function getFinalVoteSummary(debate: Debate) {
  return summarizeVotes(debate.votes, 'FINAL', null);
}

export function getDebateStatusLabel(status: DebateStatus) {
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

function cloneDebates(debates: Debate[], update: (debate: Debate) => Debate) {
  return debates.map((debate) => update(debate));
}

function upsertVote(
  votes: Vote[],
  vote: Omit<Vote, 'id' | 'createdAt'>,
) {
  const next = votes.filter((item) => {
    if (item.voterKey !== vote.voterKey || item.round !== vote.round) {
      return true;
    }

    if (vote.round === 'FINAL') {
      return false;
    }

    return item.topicId !== vote.topicId;
  });

  next.push({
    ...vote,
    id: uid('vote'),
    createdAt: timestamp(),
  });

  return next;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const serializedRef = useRef('');

  useEffect(() => {
    const next = loadState();
    setState(next);
    setReady(true);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    serializedRef.current = raw ?? '';
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const snapshot = JSON.stringify(state);
    if (snapshot === serializedRef.current) {
      return;
    }

    serializedRef.current = snapshot;
    window.localStorage.setItem(STORAGE_KEY, snapshot);
  }, [ready, state]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue || event.newValue === serializedRef.current) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as WorkspaceState;
        if (parsed?.debates?.length) {
          serializedRef.current = event.newValue;
          setState(parsed);
        }
      } catch {
        // Ignore malformed sync payloads and keep the current local workspace.
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value: StoreValue = {
    ready,
    state,
    session: state.session,
    debates: state.debates,
    activeDebate: state.debates.find((debate) => debate.id === state.activeDebateId) ?? state.debates[0],
    setActiveDebateId(debateId) {
      setState((previous) => ({
        ...previous,
        activeDebateId: debateId,
      }));
    },
    createDebate(input) {
      const nextDebate = createDebateDraft({
        title: input.title,
        theme: input.theme,
        ownerEmail: state.session?.email ?? null,
      });

      setState((previous) => ({
        ...previous,
        debates: [nextDebate, ...previous.debates],
        activeDebateId: nextDebate.id,
      }));

      return nextDebate;
    },
    updateDebate(debateId, patch) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) =>
          debate.id === debateId
            ? {
                ...debate,
                ...patch,
                updatedAt: timestamp(),
              }
            : debate,
        ),
      }));
    },
    addTopic(debateId, input = {}) {
      let created: Topic | null = null;

      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId) {
            return debate;
          }

          const topic = createTopic(debate.topics.length, input);
          created = topic;

          return {
            ...debate,
            topics: [...debate.topics, topic],
            currentTopicId: debate.currentTopicId ?? topic.id,
            updatedAt: timestamp(),
          };
        }),
      }));

      return created;
    },
    updateTopic(debateId, topicId, patch) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId) {
            return debate;
          }

          return {
            ...debate,
            topics: debate.topics.map((topic) =>
              topic.id === topicId
                ? {
                    ...topic,
                    ...patch,
                  }
                : topic,
            ),
            updatedAt: timestamp(),
          };
        }),
      }));
    },
    activateTopic(debateId, topicId) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId || debate.status === 'FINAL' || debate.status === 'ENDED') {
            return debate;
          }

          return {
            ...debate,
            status: 'LIVE',
            currentTopicId: topicId,
            updatedAt: timestamp(),
          };
        }),
      }));
    },
    enterFinalVote(debateId) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId) {
            return debate;
          }

          return {
            ...debate,
            status: 'FINAL',
            currentTopicId: null,
            finalWinner: null,
            finalSummary: null,
            updatedAt: timestamp(),
          };
        }),
      }));
    },
    clearVotes(debateId) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId) {
            return debate;
          }

          return {
            ...debate,
            votes: [],
            finalWinner: null,
            finalSummary: null,
            updatedAt: timestamp(),
          };
        }),
      }));
    },
    generateFinalResult(debateId) {
      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (debate) => {
          if (debate.id !== debateId || debate.status !== 'FINAL') {
            return debate;
          }

          const summary = getFinalVoteSummary(debate);
          let finalWinner: VoteSide | null = null;

          if (summary.pro > summary.con) {
            finalWinner = 'PRO';
          } else if (summary.con > summary.pro) {
            finalWinner = 'CON';
          }

          const winnerLabel =
            finalWinner === 'PRO' ? '正方胜出' : finalWinner === 'CON' ? '反方胜出' : '平局';

          return {
            ...debate,
            status: 'ENDED',
            finalWinner,
            finalSummary: `${winnerLabel} · ${summary.pro} 票对 ${summary.con} 票`,
            updatedAt: timestamp(),
          };
        }),
      }));
    },
    castVote(debateToken, side, voterKey) {
      const debate = state.debates.find((item) => item.publicToken === debateToken);
      if (!debate || debate.status === 'ENDED') {
        return { ok: false, error: '该辩论会当前不接受投票。' };
      }

      const round = getVoteScope(debate);
      const topicId = round === 'TOPIC' ? getCurrentTopic(debate)?.id ?? null : null;

      setState((previous) => ({
        ...previous,
        debates: cloneDebates(previous.debates, (item) => {
          if (item.id !== debate.id) {
            return item;
          }

          return {
            ...item,
            votes: upsertVote(item.votes, {
              debateId: item.id,
              topicId,
              round,
              side,
              voterKey,
            }),
            updatedAt: timestamp(),
          };
        }),
      }));

      return { ok: true };
    },
    register(email, password) {
      const normalized = normalizeEmail(email);
      if (!normalized || !password) {
        return { ok: false, error: '请输入邮箱和密码。' };
      }

      if (state.accounts.some((account) => account.email === normalized)) {
        return { ok: false, error: '这个邮箱已经注册过了。' };
      }

      const session: Session = {
        email: normalized,
        token: uid('session'),
        createdAt: timestamp(),
      };

      setState((previous) => ({
        ...previous,
        accounts: [
          ...previous.accounts,
          {
            email: normalized,
            password,
            createdAt: timestamp(),
          },
        ],
        session,
      }));

      return { ok: true };
    },
    login(email, password) {
      const normalized = normalizeEmail(email);
      const account = state.accounts.find((item) => item.email === normalized);

      if (!account || account.password !== password) {
        return { ok: false, error: '邮箱或密码不正确。' };
      }

      setState((previous) => ({
        ...previous,
        session: {
          email: normalized,
          token: uid('session'),
          createdAt: timestamp(),
        },
      }));

      return { ok: true };
    },
    logout() {
      setState((previous) => ({
        ...previous,
        session: null,
      }));
    },
    getDebateByToken(token) {
      return state.debates.find((debate) => debate.publicToken === token);
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }

  return context;
}
