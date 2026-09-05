import {env} from 'cloudflare:workers';
import {seed} from '@/lib/domain';
export async function readWorkspace(){
 const db=env.DB;
 let row=await db.prepare('SELECT data,revision FROM workspace WHERE id=?').bind('demo').first<{data:string;revision:number}>();
 if(!row){
  await db.prepare('INSERT OR IGNORE INTO workspace (id,data,revision) VALUES (?,?,0)').bind('demo',JSON.stringify(seed())).run();
  row=await db.prepare('SELECT data,revision FROM workspace WHERE id=?').bind('demo').first<{data:string;revision:number}>();
 }
 if(!row)throw new Error('Workspace could not be loaded.');return {data:JSON.parse(row.data),revision:row.revision};
}
export async function writeWorkspace(data:unknown,revision:number){return env.DB.prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(data),'demo',revision).run();}
