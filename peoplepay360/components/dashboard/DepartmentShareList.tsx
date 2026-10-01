'use client';

import { Building2 } from 'lucide-react';
import { money } from '@/lib/domain';
import type { DepartmentShareRow } from '@/lib/dashboard-types';

export interface DepartmentShareListProps {
  rows: DepartmentShareRow[];
  totalAmount: number;
  departmentFilter: string;
  onSelectDepartment: (department: string) => void;
  onClearFilter: () => void;
}

export function DepartmentShareList({
  rows,
  totalAmount,
  departmentFilter,
  onSelectDepartment,
  onClearFilter,
}: DepartmentShareListProps) {
  return (
    <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Building2 size={16} className="text-slate-700" />
          Department Share
        </h2>
        <span className="text-xs font-bold text-slate-400">{rows.length} depts</span>
      </div>
      <div className="space-y-3.5 pt-4 flex-1">
        {rows.map((d) => {
          const pct = Math.round((d.amount / totalAmount) * 100);
          return (
            <div key={d.name} className="group cursor-pointer" onClick={() => onSelectDepartment(d.name)}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors flex items-center gap-2">
                  {d.name}
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                    {d.count}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{money(d.amount)}</span>
                  <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 group-hover:bg-amber-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {departmentFilter !== 'All' && (
        <button
          onClick={onClearFilter}
          className="mt-4 text-xs font-bold text-amber-700 hover:underline cursor-pointer text-left"
        >
          Clear department filter
        </button>
      )}
    </div>
  );
}
