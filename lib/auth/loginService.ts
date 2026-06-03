import type { UserRepository } from '../db/userRepository';
import { verifyPassword } from './password';
import type { SessionPayload } from './session';

/** Returns a session payload if the credentials are valid, else null. */
export async function authenticate(
  repo: UserRepository,
  username: string,
  password: string,
): Promise<SessionPayload | null> {
  const user = await repo.findByUsername(username);
  if (!user) return null;
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  return { userId: user.id, username: user.username, isAdmin: user.isAdmin };
}
