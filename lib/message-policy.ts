// Shared with the composer; the server always enforces this before saving.
export function containsContactDetails(input:string):boolean {
 const normalized=input.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'');
 const numbers=normalized.replace(/\b\d{4}-\d{2}-\d{2}\b/g,'[date]').replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[\u0966-\u096F]/g,c=>String(c.charCodeAt(0)-0x966));
 if(/(?:\+?\d[\s().\-]*){10,15}/.test(numbers))return true;
 if(/\b[a-z0-9._-]+\s+at\s+(?:ybl|ibl|axl|okaxis|okicici|okhdfcbank|oksbi|paytm|upi)\b/i.test(numbers))return true;
 if(/\bupi\s*:\s*\/\//i.test(numbers))return true;
 // A payment handle is not an in-app @username mention.
 if(/\b[a-z0-9][a-z0-9._-]{1,255}\s*(?:@|\(at\)|\[at\])\s*[a-z][a-z0-9.-]{1,80}\b/i.test(numbers))return true;
 const digits:Record<string,string>={zero:'0',oh:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
 const spelled=numbers.toLowerCase().replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g,w=>digits[w]);
 return /(?:\d[\s,().\-]*){10,15}/.test(spelled);
}
export const blockedMessage='Message not sent: phone numbers and payment IDs are not allowed. Keep the discussion here.';
