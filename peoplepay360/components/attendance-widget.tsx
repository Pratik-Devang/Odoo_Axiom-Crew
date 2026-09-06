'use client';

import React, { useMemo } from 'react';
import { Power, ArrowRight, CheckCircle2, Clock3 } from 'lucide-react';
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
  onHeaderIconClick?: () => void;
  busy?: boolean;
  isPopup?: boolean;
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
  if (diff < 0) diff += 24 * 60; // Support shifts passing midnight
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
  onHeaderIconClick,
  busy = false,
  isPopup = false,
  className = '',
}: AttendanceWidgetProps) {
  // Check-in and check-out time formatting
  const checkInFormatted = useMemo(() => {
    return currentClock?.checkIn ? formatTimeString12(currentClock.checkIn) : '--:--';
  }, [currentClock?.checkIn]);

  const checkOutFormatted = useMemo(() => {
    return currentClock?.checkOut ? formatTimeString12(currentClock.checkOut) : '';
  }, [currentClock?.checkOut]);

  // Elapsed time calculation for the current/latest shift
  const { formatted: elapsedFormatted } = useMemo(() => {
    if (signedIn && currentClock?.checkIn) {
      return calculateElapsed(currentClock.checkIn, undefined, clockNow);
    }
    if (currentClock?.checkIn && currentClock?.checkOut) {
      return calculateElapsed(currentClock.checkIn, currentClock.checkOut, clockNow);
    }
    return { formatted: '0h00', totalMinutes: 0 };
  }, [signedIn, currentClock?.checkIn, currentClock?.checkOut, clockNow]);

  // Total accumulated worked time today across records
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
    <div
      className={`workora-card bg-white rounded-3xl border border-[#e5ded4] p-5 sm:p-6 shadow-sm transition-all relative overflow-hidden select-none ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100/90">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-800 tracking-tight">Attendance Widget</span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Indicator Dot: Green when active/checked-in, Red when inactive */}
          <div className="flex items-center gap-1.5" title={signedIn ? 'Active shift in progress' : 'No active shift'}>
            <span
              className={`size-2.5 rounded-full transition-colors ${
                signedIn
                  ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-rose-500 ring-4 ring-rose-100'
              }`}
            />
          </div>

          {/* Red/Green Attendance Power Icon */}
          <button
            type="button"
            onClick={onHeaderIconClick}
            title={signedIn ? 'Checked In · Active Shift' : 'Click to Check In'}
            className={`size-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              signedIn
                ? 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-2xs'
                : 'border-rose-300 bg-rose-50 text-rose-500 hover:bg-rose-100 shadow-2xs'
            }`}
          >
            <Power size={13} className="stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* ── Greeting & User Name ── */}
      <div className="py-4 space-y-0.5">
        <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase block">
          Welcome back
        </span>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-serif italic">
          {userName}!
        </h2>
      </div>

      {/* ── Time Information Breakdown ── */}
      <div className="rounded-2xl bg-[#faf8f5] border border-[#e5ded4]/80 p-3.5 sm:p-4 space-y-3 my-1">
        {/* Row 1: Check-in time to Now & Elapsed */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-800">
              {signedIn
                ? `${checkInFormatted} — Now`
                : isCompleted
                ? `${checkInFormatted} — ${checkOutFormatted}`
                : 'Not checked in — Now'}
            </span>
          </div>
          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#e5ded4] shadow-2xs">
            {elapsedFormatted}
          </span>
        </div>

        {/* Subtle separator */}
        <div className="border-t border-slate-200/60" />

        {/* Row 2: Today Total */}
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="text-slate-500 font-medium">Today</span>
          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-[#e5ded4] shadow-2xs">
            {todayTotalFormatted}
          </span>
        </div>
      </div>

      {/* ── Action CTA Button ── */}
      <div className="pt-3">
        {signedIn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckOut()}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-[#e6a817] hover:bg-[#d49910] text-slate-950 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <Power size={16} className="stroke-[2.5]" />
            Check Out
          </button>
        ) : isCompleted ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckIn()}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-[#faf8f5] hover:bg-[#ede7de] border border-[#e5ded4] text-slate-800 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <CheckCircle2 size={16} className="text-emerald-600" />
            Shift Completed · Check In Again
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCheckIn()}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-[#e6a817] hover:bg-[#d49910] text-slate-950 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            <Power size={16} className="stroke-[2.5]" />
            Check In
          </button>
        )}
      </div>

      {/* ── Note Text ── */}
      <p className="text-[11px] text-slate-400 text-center leading-relaxed mt-3 px-1">
        Employees can mark attendance from the quick widget and review records from the Attendance module.
      </p>

      {/* ── Review Records Link ── */}
      {onViewRecords && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onViewRecords}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#c99a2e] hover:text-[#9e761a] hover:underline transition-colors cursor-pointer"
          >
            <Clock3 size={13} />
            Review Attendance Records
            <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

