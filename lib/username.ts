import {z} from 'zod';

export const usernameSchema = z.string().trim().toLowerCase().min(3).max(24)
  .regex(/^[a-z][a-z0-9_]+$/, 'Use 3–24 letters, numbers or underscores, starting with a letter.');

export function usernameFromName(name: string) {
  const letters = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = /^[a-z]/.test(letters) ? letters : letters ? 'member' + letters : 'member';
  return (base.length < 3 ? base + 'film' : base).slice(0, 24);
}

export function usernameCandidate(base: string, attempt: number) {
  const suffix = attempt ? String(attempt + 1) : '';
  return base.slice(0, 24 - suffix.length) + suffix;
}
