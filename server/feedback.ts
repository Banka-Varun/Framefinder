import {z} from 'zod';
import {run, one} from '@/lib/platform';
import {ApiError, user, body, limit, now} from './security';

export async function feedback(req: Request) {
  if (req.method !== 'POST') throw new ApiError(405, 'Method not allowed');
  const account = (await user(req))!;
  const input = z.object({
    id: z.string().uuid(), kind: z.enum(['contact', 'report', 'rating']),
    category: z.enum(['general', 'account', 'upload', 'booking', 'notifications', 'listing', 'privacy', 'feedback']),
    message: z.string().trim().max(2000), rating: z.number().min(1).max(5).multipleOf(0.5).optional(), publicConsent:z.boolean().default(false),
  }).strict().parse(await body(req));
  if (input.kind === 'rating' ? !input.rating : input.message.length < 10)
    throw new ApiError(400, input.kind === 'rating' ? 'Choose a rating from 1 to 5.' : 'Describe the issue in at least 10 characters.');
  if(input.publicConsent&&input.kind!=='rating')throw new ApiError(400,'Only ratings can be shared publicly.');
  await limit('feedback:' + account.id, 10, 3600);
  const inserted = await run('INSERT INTO member_feedback(id,user_id,kind,category,message,rating,created_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
    [input.id, account.id, input.kind, input.category, input.message, input.rating || null, now()]);
  if (!inserted.changes && !await one('SELECT id FROM member_feedback WHERE id=? AND user_id=?', [input.id, account.id]))
    throw new ApiError(409, 'This request reference is already in use. Please submit again.');
  if(inserted.changes&&input.kind==='rating')await run('INSERT INTO feedback_publication(feedback_id,consent) VALUES(?,?)',[input.id,+input.publicConsent]);
  return Response.json({ok: true, reference: input.id});
}
