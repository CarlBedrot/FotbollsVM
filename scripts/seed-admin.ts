import { getUserRepository } from '../lib/db/repository';
import { hashPassword } from '../lib/auth/password';

async function main() {
  const username = process.env.ADMIN_USERNAME ?? process.argv[2];
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3];
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Carl';
  if (!username || !password) {
    console.error('Usage: ADMIN_USERNAME=.. ADMIN_PASSWORD=.. npm run seed:admin');
    process.exit(1);
  }
  const repo = getUserRepository();
  if (await repo.findByUsername(username)) {
    console.log(`admin "${username}" already exists`);
    return;
  }
  const user = await repo.create({
    username, displayName, passwordHash: await hashPassword(password),
    isAdmin: true, color: '#e23b3b',
  });
  console.log(`created admin "${user.username}" (${user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
