import {one, run} from '@/lib/platform';
import {usernameFromName, usernameCandidate} from '@/lib/username';
import {ApiError, now} from './security';

export async function suggestUsername(name: string) {
  const base = usernameFromName(name);
  for (let attempt = 0; attempt < 30; attempt++) {
    const candidate = usernameCandidate(base, attempt);
    if (!await one('SELECT id FROM accounts WHERE username=?', [candidate])) return candidate;
  }
  return base.slice(0, 15) + '_' + crypto.randomUUID().slice(0, 8);
}

export async function createGoogleAccount(info: {email: string; name?: string; sub: string}) {
  const id = crypto.randomUUID();
  const name = (info.name || 'Film member').trim().slice(0, 60) || 'Film member';
  const base = usernameFromName(name);
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = attempt < 30 ? usernameCandidate(base, attempt)
      : base.slice(0, 15) + '_' + crypto.randomUUID().slice(0, 8);
    // The unique constraint is authoritative, including simultaneous signups.
    const result = await run('INSERT INTO accounts(id,email,username,name,google_id,verified,created_at) VALUES(?,?,?,?,?,1,?) ON CONFLICT(username) DO NOTHING',
      [id, info.email.toLowerCase(), candidate, name, info.sub, now()]);
    if (result.changes) return id;
  }
  throw new ApiError(409, 'Could not reserve a username. Please try signing in again.');
}
