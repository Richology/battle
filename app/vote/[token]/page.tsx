import { VoteScreen } from '@/components/vote-screen';
import { getDebateForPublic } from '@/lib/debate';

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let initialState = null;
  try {
    initialState = await getDebateForPublic(token);
  } catch {
    initialState = null;
  }

  return <VoteScreen token={token} initialState={initialState} />;
}
