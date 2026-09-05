'use client';

import { Wallet } from 'lucide-react';
import { money } from '@/lib/domain';
import type { TopEarnerRow } from '@/lib/dashboard-types';
import { niceMonth } from '@/components/peoplepay-ui';

export interface TopNetPayListProps {
  period: string;
  earners: TopEarnerRow[];
  maxNet: number;
  onSelectEmployee: (employeeId: string) => void;
}

export function TopNetPayList({ period, earners, maxNet, onSelectEmployee }: TopNetPayListProps) {
  return (
    <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Wallet size={16} className="text-slate-700" />
          Top Net Pay
        </h2>
        <span className="text-xs font-bold text-slate-400">{niceMonth(period)}</span>
      </div>
      <div className="space-y-3 pt-4 flex-1">
        {earners.map((e, idx) => {
          const pct = Math.round((e.net / maxNet) * 100);
          return (
            <button
              key={e.id}
              onClick={() => onSelectEmployee(e.id)}
              className="w-full text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors truncate pr-2">
                  <span className="text-slate-400 font-semibold mr-1.5">{idx + 1}.</span>
                  {e.name}
                </span>
                <span className="font-extrabold text-slate-900 shrink-0">{money(e.net)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 group-hover:bg-amber-600 rounded-full transition-all"
                    style={{ width: `${Math.max(8, pct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 w-16 truncate">{e.department}</span>
              </div>
              {!e.hasSlip && <span className="text-[10px] text-slate-400 font-medium">Estimated</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
