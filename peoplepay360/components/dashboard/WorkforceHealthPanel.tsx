'use client';

import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { WorkforceHealthMetrics } from '@/lib/dashboard-types';

export interface WorkforceHealthPanelProps {
  metrics: WorkforceHealthMetrics;
  onNavigate: () => void;
}

export function WorkforceHealthPanel({ metrics, onNavigate }: WorkforceHealthPanelProps) {
  return (
    <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Clock3 size={16} className="text-slate-700" />
          Workforce Health
        </h2>
        <button
          onClick={onNavigate}
          className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
        >
          View <ArrowUpRight size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 mb-4">
        <div className="p-3 rounded-xl bg-[#faf7f3] border border-[#e5ded4]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Punched In</span>
          <span className="text-lg font-black text-emerald-700">{metrics.presentCount}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{metrics.completeCount} completed</span>
        </div>
        <div className="p-3 rounded-xl bg-[#faf7f3] border border-[#e5ded4]">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Time Off</span>
          <span className="text-lg font-black text-amber-700">{metrics.approvedTimeOffDays}d</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{metrics.pendingRequests} pending</span>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {[
          { label: 'On-time', value: Math.max(0, metrics.presentCount - metrics.lateCount), color: 'bg-emerald-500' },
          { label: 'Late', value: metrics.lateCount, color: 'bg-amber-500' },
          { label: 'Absent', value: metrics.absentCount, color: 'bg-rose-500' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-0">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${row.color}`} />
              {row.label}
            </span>
            <span className="font-extrabold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
        <span className="font-medium">Overtime:</span>{' '}
        <span className="font-bold text-slate-800">{metrics.overtimeCount} shifts &gt; 9 hrs</span>
      </div>
    </div>
  );
}
