import {z} from 'zod';
import {theaters,extractEventCode} from './booking';
export const seatAlertSchema=z.object({id:z.string().uuid(),kind:z.literal('seat-release'),city:z.literal('Hyderabad'),theaterId:z.string().refine(id=>theaters.some(t=>t.id===id),'Choose a listed theater.'),title:z.string().trim().min(1).max(120),dates:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s)).min(1,'Choose at least one date.').max(31,'Choose up to 31 dates.').refine(a=>new Set(a).size===a.length,'Remove duplicate dates.'),bookingUrl:z.string().max(1000).refine(s=>!s||!!extractEventCode(s),'Use a public BookMyShow movie URL.').default('')}).strict();
export type SeatAlert=z.infer<typeof seatAlertSchema>;
