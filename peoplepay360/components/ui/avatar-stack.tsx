'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AvatarStackProps {
  names: string[];
  max?: number;
  size?: 'sm' | 'default';
  className?: string;
}

export function AvatarStack({
  names,
  max = 3,
  size = 'sm',
  className,
}: AvatarStackProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;

  const sizeClasses = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs';
  const overlapMargin = size === 'sm' ? '-ml-2' : '-ml-2.5';

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((name, i) => {
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();
        return (
          <div
            key={i}
            className={cn(
              'rounded-full ring-2 ring-background shrink-0',
              i > 0 && overlapMargin
            )}
            title={name}
          >
            <Avatar className={sizeClasses}>
              <AvatarFallback className="bg-slate-100 text-slate-700 font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        );
      })}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-semibold ring-2 ring-background shrink-0',
            sizeClasses,
            overlapMargin
          )}
          title={`${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
