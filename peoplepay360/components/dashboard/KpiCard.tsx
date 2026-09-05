'use client';

import type { ElementType } from 'react';

export interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  icon: ElementType;
  accent?: boolean;
  onClick?: () => void;
}

export function KpiCard({ label, value, sub, delta, icon: Icon, accent, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left flex flex-col justify-between gap-3 cursor-pointer
        transition-all hover:shadow-md hover:scale-[1.01] active:scale-100
        ${
          accent
            ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-sm'
            : 'bg-white border-[#e5ded4] hover:border-[#c4b8aa] shadow-2xs'
        }`}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            accent ? 'text-amber-400' : 'text-[#7a6f65]'
          }`}
        >
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            accent ? 'bg-white/10' : 'bg-[#faf7f3] border border-[#e5ded4]'
          }`}
        >
          <Icon size={15} className={accent ? 'text-amber-400' : 'text-[#5a5047]'} />
        </div>
      </div>

      <div>
        <span
          className={`text-2xl font-extrabold tracking-tight leading-none block ${
            accent ? 'text-white' : 'text-[#1a1a1a]'
          }`}
        >
          {value}
        </span>
        {(sub || delta) && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {delta && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  delta.startsWith('+')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : delta.startsWith('-')
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : accent
                    ? 'bg-white/10 text-amber-300 border border-white/20'
                    : 'bg-[#fdf3d7] text-[#c99a2e] border border-[#e9b84a]'
                }`}
              >
                {delta}
              </span>
            )}
            {sub && (
              <span className={`text-[11px] font-medium ${accent ? 'text-slate-300' : 'text-[#8c7f75]'}`}>
                {sub}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
