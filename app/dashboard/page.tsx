import { redirect } from 'next/navigation';

import { DashboardScreen, type DashboardDebateSummary } from '@/components/dashboard-screen';
import { getCurrentUser } from '@/lib/auth';
import { buildStagePath, buildVotePath, getDebateForOwner, getOwnerDebates } from '@/lib/debate';

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const debates = await getOwnerDebates(user.id);
  const summaries: DashboardDebateSummary[] = debates.map((debate) => ({
    id: debate.id,
    publicToken: debate.publicToken,
    title: debate.title,
    theme: debate.theme,
    status: debate.status,
    currentTopicId: debate.currentTopicId,
    currentTopic: debate.currentTopic
      ? {
          id: debate.currentTopic.id,
          title: debate.currentTopic.title,
        }
      : null,
    topicCount: debate.topics.length,
    stagePath: buildStagePath(debate.publicToken),
    votePath: buildVotePath(debate.publicToken),
    createdAt: debate.createdAt.toISOString(),
    updatedAt: debate.updatedAt.toISOString(),
  }));

  const initialState = debates[0] ? await getDebateForOwner(user.id, debates[0].id) : null;

  return <DashboardScreen userEmail={user.email} debates={summaries} initialState={initialState} />;
}
