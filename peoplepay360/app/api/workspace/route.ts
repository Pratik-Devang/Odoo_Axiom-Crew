import {readWorkspace,writeWorkspace} from '@/db/store';
import {mutate} from '@/lib/actions';
export async function GET(){try{return Response.json(await readWorkspace(),{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'The workspace database is unavailable. Please retry.'},{status:503});}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Cross-origin changes are not allowed.'},{status:403});
 try{if(Number(request.headers.get('content-length')||0)>100000)return Response.json({error:'Request too large.'},{status:413});const body=(await request.json()) as any;const current=await readWorkspace();if(body.revision!==current.revision)return Response.json({error:'The workspace changed in another session. Reload and try again.'},{status:409});const next=mutate(current.data,body.action,body.payload||{});const result=await writeWorkspace(next,current.revision);if(!result.meta.changes)return Response.json({error:'Another change was saved first. Reload and try again.'},{status:409});return Response.json({data:next,revision:current.revision+1});}catch(error){return Response.json({error:error instanceof Error?error.message:'Unable to save changes.'},{status:400});}
}
