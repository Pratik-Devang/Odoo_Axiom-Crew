'use client';
import type {ReactNode} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Table,TableHeader,TableHead,TableRow,TableBody,TableCell} from '@/components/ui/table';
import type {Row} from '@/lib/domain';
import {StatusBadge} from '@/components/ui/status-badge';
import {Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription} from '@/components/ui/empty';
import {Inbox} from 'lucide-react';

export function Picker({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:({value:string;label:string}|string)[]}){
  return (
    <Select value={value} onValueChange={v=>onChange(String(v??''))}>
      <SelectTrigger aria-label={label} className="h-9 px-3 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 min-w-[140px]">
        <SelectValue>{options.map(o=>typeof o==='string'?{value:o,label:o}:o).find(o=>o.value===value)?.label||label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-slate-200 bg-white shadow-lg">
        {options.map(o=>typeof o==='string'?{value:o,label:o}:o).map(o=><SelectItem key={o.value} value={o.value} className="text-xs rounded-lg">{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function Badge({value}:{value:string}){
  return <StatusBadge value={value}/>;
}

export function Avatar({name}:{name:string}){
  return (
    <span className="inline-flex items-center justify-center size-8 rounded-full bg-slate-900 text-white font-semibold text-xs shrink-0 border border-slate-200/60 shadow-2xs">
      {name.split(' ').map(n=>n[0]).slice(0,2).join('')}
    </span>
  );
}

export function DataTable({columns,rows,empty='No records match your filters.'}:{columns:{title:string;render:(row:Row)=>ReactNode}[];rows:Row[];empty?:string}){
  return (
    <div className="overflow-x-auto w-full">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="bg-slate-50/60 hover:bg-slate-50/60 border-b border-slate-100">
            {columns.map((c,i)=>(
              <TableHead key={i} className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3.5 px-4">
                {c.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r=>(
            <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100/80">
              {columns.map((c,i)=>(
                <TableCell key={i} className="py-3 px-4 text-xs font-medium text-slate-700">
                  {c.render(r)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!rows.length&&(
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10">
                <Empty className="py-6">
                  <EmptyMedia variant="icon"><Inbox className="size-5 text-slate-400"/></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm font-semibold text-slate-700">No records found</EmptyTitle>
                    <EmptyDescription className="text-xs text-slate-400">{empty}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function Field({label,children,wide=false}:{label:string;children:ReactNode;wide?:boolean}){
  return (
    <label className={'flex flex-col gap-1.5 text-xs font-semibold text-slate-700 '+(wide?'col-span-full':'')}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export const niceMonth=(p:string)=>new Date(p+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'});

export function downloadCsv(name:string,rows:(string|number)[][]){
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');
  a.href=url;
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
