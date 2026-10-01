'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type AppStatus =
  | 'Paid'
  | 'Approved'
  | 'Active'
  | 'Running'
  | 'Present'
  | 'Draft'
  | 'Computed'
  | 'Pending'
  | 'Late'
  | 'Upcoming'
  | 'Missing check-out'
  | 'Validated'
  | 'Refused'
  | 'Absent'
  | 'Archived'
  | 'Expired'
  | 'Inactive'
  | string;

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: AppStatus;
  size?: 'sm' | 'default';
  showDot?: boolean;
}

export function StatusBadge({
  value,
  size = 'default',
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  let styleClasses = 'bg-slate-100 text-slate-700 border-slate-200/80';
  let dotColor = 'bg-slate-400';

  const positive = ['Paid', 'Approved', 'Active', 'Running', 'Present', 'Completed'];
  const pending = ['Draft', 'Computed', 'Pending', 'Late', 'Upcoming', 'Missing check-out'];
  const negative = ['Refused', 'Absent', 'Archived', 'Expired'];

  if (positive.includes(value)) {
    styleClasses = 'bg-slate-50 text-slate-800 border-slate-200';
    dotColor = 'bg-emerald-500';
  } else if (value === 'Validated') {
    styleClasses = 'bg-slate-900 text-white border-slate-900';
    dotColor = 'bg-white';
  } else if (value === 'Inactive') {
    styleClasses = 'bg-slate-100 text-slate-500 border-slate-200';
    dotColor = 'bg-slate-400';
  } else if (pending.includes(value)) {
    styleClasses = 'bg-slate-50 text-slate-700 border-slate-200';
    dotColor = 'bg-amber-500';
  } else if (negative.includes(value)) {
    styleClasses = 'bg-slate-50 text-slate-700 border-slate-200';
    dotColor = 'bg-rose-500';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border rounded-full transition-colors whitespace-nowrap shadow-2xs',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        styleClasses,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn('size-1.5 rounded-full shrink-0', dotColor)}
          aria-hidden="true"
        />
      )}
      {value}
    </span>
  );
}
