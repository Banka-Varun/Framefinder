import {z} from 'zod';
import directory from '@/data/theaters.json';
export const theaters=directory;
export const formats=['2D','3D','IMAX 2D','IMAX 3D','4DX','4DX 3D','PCX','HDR By Barco','DOLBY CINEMA 2D','DOLBY CINEMA 3D'] as const;
export const languages=['Telugu','English','Hindi','Tamil','Malayalam','Kannada'] as const;
export const editions=['Original release','Re-release','Special edition'] as const;
const realDate=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;},'Choose a valid date.');
export const alertSchema=z.object({
 id:z.string().min(1).max(80),title:z.string().trim().min(1,'Enter a movie title.').max(120),
 city:z.literal('Hyderabad'),date:realDate,language:z.enum(languages),edition:z.enum(editions),
 formats:z.array(z.enum(formats)).min(1,'Select a format.').max(formats.length).refine(a=>new Set(a).size===a.length),
 theaterIds:z.array(z.string()).min(1,'Select at least one theater.').max(directory.length).refine(a=>a.every(id=>directory.some(t=>t.id===id))&&new Set(a).size===a.length,'Choose theaters from the list.'),
 timeFrom:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timeTo:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),timeZone:z.literal('Asia/Kolkata'),
 bookingUrl:z.string().max(1000).refine(s=>s===''||!!extractEventCode(s),'Use a BookMyShow movie URL containing its event ID.'),
 kind:z.literal('booking-open'),
}).strict().refine(a=>a.timeFrom<=a.timeTo,{path:['timeTo'],message:'End time must be after start time on the selected date.'});
export type CompleteAlert=z.infer<typeof alertSchema>;
export type BookingAlert={id:string;title:string;city:string;date:string}&Partial<Omit<CompleteAlert,'id'|'title'|'city'|'date'>>;
export function extractEventCode(input:string){try{const url=new URL(input);if(url.protocol!=='https:'||url.hostname!=='in.bookmyshow.com'||url.username||url.password||url.port)return null;return url.pathname.split('/').find(s=>/^ET\d+$/.test(s))||null;}catch{return null;}}
export function completeAlert(a:BookingAlert){return alertSchema.safeParse(a).success;}
export function indiaToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function exportMonitorConfig(alerts:BookingAlert[]){return {schemaVersion:1,alerts:alerts.filter(completeAlert).map(a=>({...a,eventCode:extractEventCode(a.bookingUrl||''),regionCode:'HYD',theaters:directory.filter(t=>a.theaterIds!.includes(t.id))}))};}
