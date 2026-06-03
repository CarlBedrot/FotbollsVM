import { currentUser } from './currentUser';
import type { SessionPayload } from './session';

export async function requireAdmin(): Promise<SessionPayload | null> {
  const user = await currentUser();
  return user?.isAdmin ? user : null;
}
