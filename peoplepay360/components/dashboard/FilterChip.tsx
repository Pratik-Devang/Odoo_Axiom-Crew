'use client';

export interface FilterChipProps {
  label: string;
  value: string;
}

export function FilterChip({ label, value }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-[#faf7f3] border border-[#e5ded4] rounded-full px-3 py-1">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-900">{value}</span>
    </span>
  );
}
