'use client';

import React, { useMemo } from 'react';
import { Power } from 'lucide-react';
import type { Row } from '@/lib/domain';

export interface AttendanceWidgetProps {
  userName: string;
  currentClock: Row | null | undefined;
  signedIn: boolean;
  clockNow: Date | null;
  todayRecords?: Row[];
  onCheckIn: () => Promise<void> | void;
  onCheckOut: () => Promise<void> | void;
  onViewRecords?: () => void;
  busy?: boolean;
  className?: string;
}

/**
 * Format "HH:mm" (24h) to "h:mm A" (12h)
 */
export function formatTimeString12(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (Number.isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Calculate elapsed minutes and format as "XhYY" (e.g. 6h56)
 */
export function calculateElapsed(
  checkInStr?: string,
  checkOutStr?: string,
  now?: Date | null
): { formatted: string; totalMinutes: number } {
  if (!checkInStr) return { formatted: '0h00', totalMinutes: 0 };
  const inParts = checkInStr.split(':');
  if (inParts.length < 2) return { formatted: '0h00', totalMinutes: 0 };
  const inMinutes = parseInt(inParts[0], 10) * 60 + parseInt(inParts[1], 10);

  let endMinutes = 0;
  if (checkOutStr) {
    const outParts = checkOutStr.split(':');
    endMinutes = parseInt(outParts[0], 10) * 60 + parseInt(outParts[1], 10);
  } else if (now) {
    const kolkataTime = now.toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
    });
    const nowParts = kolkataTime.split(':');
    endMinutes = parseInt(nowParts[0], 10) * 60 + parseInt(nowParts[1], 10);
  } else {
    return { formatted: '0h00', totalMinutes: 0 };
  }

  let diff = endMinutes - inMinutes;
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return {
    formatted: `${hours}h${mins < 10 ? '0' + mins : mins}`,
    totalMinutes: diff,
  };
}

export function AttendanceWidget({
  userName,
  currentClock,
  signedIn,
  clockNow,
  todayRecords = [],
  onCheckIn,
  onCheckOut,
  onViewRecords,
  busy = false,
  className = '',
}: AttendanceWidgetProps) {
  const checkInFormatted = useMemo(() => {
    return currentClock?.checkIn ? formatTimeString12(currentClock.checkIn) : '--:--';
  }, [currentClock?.checkIn]);

  const checkOutFormatted = useMemo(() => {
    return currentClock?.checkOut ? formatTimeString12(currentClock.checkOut) : '';
  }, [currentClock?.checkOut]);

  const { formatted: elapsedFormatted } = useMemo(() => {
    if (signedIn && currentClock?.checkIn) {
      return calculateElapsed(currentClock.checkIn, undefined, clockNow);
    }
    if (currentClock?.checkIn && currentClock?.checkOut) {
      return calculateElapsed(currentClock.checkIn, currentClock.checkOut, clockNow);
    }
    return { formatted: '0h00', totalMinutes: 0 };
  }, [signedIn, currentClock?.checkIn, currentClock?.checkOut, clockNow]);

  const todayTotalFormatted = useMemo(() => {
    let totalMins = 0;
    for (const r of todayRecords) {
      if (r.id === currentClock?.id && signedIn && r.checkIn) {
        totalMins += calculateElapsed(r.checkIn, undefined, clockNow).totalMinutes;
      } else if (r.checkIn && r.checkOut) {
        totalMins += calculateElapsed(r.checkIn, r.checkOut).totalMinutes;
      }
    }
    if (!totalMins && signedIn && currentClock?.checkIn) {
      totalMins = calculateElapsed(currentClock.checkIn, undefined, clockNow).totalMinutes;
    }
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h${mins < 10 ? '0' + mins : mins}`;
  }, [todayRecords, currentClock?.id, currentClock?.checkIn, signedIn, clockNow]);

  const isCompleted = !!currentClock?.checkOut && !signedIn;

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e5ded4]">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Attendance</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full transition-colors ${
              signedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span
            className={`text-xs font-semibold ${
              signedIn ? 'text-emerald-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            {signedIn ? 'Checked In' : isCompleted ? 'Shift Ended' : 'Off Shift'}
          </span>
        </div>
      </div>

      {/* Greeting */}
      <div>
        <p className="text-xs text-slate-500 font-medium">Welcome back,</p>
        <h4 className="text-lg font-bold text-slate-900 tracking-tight">{userName}</h4>
      </div>

      {/* Time Card */}
      <div className="rounded-xl border border-[#e5ded4] bg-[#faf8f5] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            {signedIn
              ? `${checkInFormatted} — Now`
              : isCompleted
              ? `${checkInFormatted} — ${checkOutFormatted}`
              : 'Shift Duration'}
          </span>
          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-[#e5ded4]">
            {elapsedFormatted}
          </span>
        </div>
        <div className="border-t border-[#e5ded4]/70" />
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Today</span>
          <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-[#e5ded4]">
            {todayTotalFormatted}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <div>
        {signedIn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckOut()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Power size={14} />
            Check Out
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckIn()}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#e6a817] hover:bg-[#d49910] text-slate-950 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            <Power size={14} />
            Check In
          </button>
        )}
      </div>

      {/* View Records Link */}
      {onViewRecords && (
        <button
          type="button"
          onClick={onViewRecords}
          className="w-full text-center text-xs font-medium text-slate-400 hover:text-slate-800 transition-colors pt-0.5 cursor-pointer"
        >
          View attendance records →
        </button>
      )}
    </div>
  );
}

