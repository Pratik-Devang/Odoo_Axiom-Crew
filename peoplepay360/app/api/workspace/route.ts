import {readWorkspace,writeWorkspace} from '@/db/store';
import {mutate} from '@/lib/actions';
export const runtime = 'nodejs';

function isAllowedOrigin(request: Request) {
 const origin=request.headers.get('origin');
 if(!origin)return true;

 // Relative fetches from a page opened through the tunnel are browser-verified
 // same-origin requests even though Next.js sees localhost behind the proxy.
 if(request.headers.get('sec-fetch-site')==='same-origin')return true;

 const requestUrl=new URL(request.url);
 const allowed=new Set([requestUrl.origin]);
 const forwardedHost=request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
 const host=forwardedHost||request.headers.get('host');
 const protocol=request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()||requestUrl.protocol.replace(':','');
 if(host)allowed.add(`${protocol}://${host}`);

 for(const configured of (process.env.ALLOWED_ORIGINS||'').split(',')){
  const value=configured.trim().replace(/\/$/,'');
  if(value)allowed.add(value);
 }

 try{return allowed.has(new URL(origin).origin);}catch{return false;}
}

export async function GET(){try{return Response.json(await readWorkspace(),{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('[Database Error]:',error);return Response.json({error:error instanceof Error?error.message:'The workspace database is unavailable. Please retry.'},{status:503});}}
export async function POST(request:Request){
 if(!isAllowedOrigin(request))return Response.json({error:'Cross-origin changes are not allowed. Add the forwarded site to ALLOWED_ORIGINS.'},{status:403});
 try{if(Number(request.headers.get('content-length')||0)>100000)return Response.json({error:'Request too large.'},{status:413});const body = (await request.json()) as { revision: number; action: string; payload?: Record<string, any> };const current=await readWorkspace();if(body.revision!==current.revision)return Response.json({error:'The workspace changed in another session. Reload and try again.'},{status:409});const next=mutate(current.data,body.action,body.payload||{});const result=await writeWorkspace(next,current.revision);if(!result.meta.changes)return Response.json({error:'Another change was saved first. Reload and try again.'},{status:409});return Response.json({data:next,revision:current.revision+1});}catch(error){return Response.json({error:error instanceof Error?error.message:'Unable to save changes.'},{status:400});}
}
