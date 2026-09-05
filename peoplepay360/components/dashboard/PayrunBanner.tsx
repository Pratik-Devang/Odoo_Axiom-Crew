'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { niceMonth } from '@/components/peoplepay-ui';

export interface PayrunBannerProps {
  period: string;
  hasPayrun: boolean;
  status?: string;
  slipCount: number;
  paidCount: number;
  onNavigate: () => void;
}

export function PayrunBanner({
  period,
  hasPayrun,
  status,
  slipCount,
  paidCount,
  onNavigate,
}: PayrunBannerProps) {
  if (!hasPayrun) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">No payrun for {niceMonth(period)}</p>
            <p className="text-xs text-amber-800/80 mt-0.5">
              Figures below are contract-based estimates. Create a payrun to compute actual payslips.
            </p>
          </div>
        </div>
        <button
          onClick={onNavigate}
          className="text-xs font-bold text-amber-900 bg-white border border-amber-200 rounded-full px-4 py-2 hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
        >
          Start Payrun
        </button>
      </div>
    );
  }

  const tone =
    status === 'Paid'
      ? 'border-emerald-200 bg-emerald-50/80'
      : status === 'Computed'
      ? 'border-blue-200 bg-blue-50/80'
      : 'border-slate-200 bg-slate-50/80';

  const iconColor = status === 'Paid' ? 'text-emerald-600' : status === 'Computed' ? 'text-blue-600' : 'text-slate-600';

  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap rounded-2xl border px-4 py-3 ${tone}`}>
      <div className="flex items-start gap-2.5">
        <CheckCircle2 size={18} className={`${iconColor} shrink-0 mt-0.5`} />
        <div>
          <p className="text-sm font-bold text-slate-900">
            Payrun {status} · {slipCount} payslips
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {paidCount > 0 ? `${paidCount} marked paid` : 'Awaiting payment confirmation'} for {niceMonth(period)}
          </p>
        </div>
      </div>
      <button
        onClick={onNavigate}
        className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
      >
        Open Payrun
      </button>
    </div>
  );
}
