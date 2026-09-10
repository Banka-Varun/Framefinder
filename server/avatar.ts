import {parseAvatar,avatarSvg} from '@/lib/avatar';
import {ApiError} from './security';
export function avatarResponse(req:Request){if(req.method!=='GET')throw new ApiError(405,'Method not allowed');const design=parseAvatar(new URL(req.url).searchParams.get('design'));if(!design)throw new ApiError(400,'Choose a valid avatar');return new Response(avatarSvg(design),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff'}});}
