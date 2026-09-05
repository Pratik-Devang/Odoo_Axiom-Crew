'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { money } from '@/lib/domain';
import { monthShort } from '@/lib/dashboard-calculations';
import type { TrendPoint } from '@/lib/dashboard-types';
import { niceMonth } from '@/components/peoplepay-ui';

function compactMoney(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

function niceAxisMax(max: number) {
  if (max <= 0) return 100000;
  const rough = max * 1.12;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function SmoothLineTrendChart({
  points,
  current,
  onPoint,
}: {
  points: TrendPoint[];
  current: string;
  onPoint?: (period: string) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 720;
  const H = 148;
  const padL = 52;
  const padR = 16;
  const padT = 12;
  const padB = 28;

  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const values = points.map((p) => p.value);
  const rawMax = Math.max(...values);
  const hasSpend = values.some((v) => v > 0);
  const allProjected = points.every((p) => p.isProjected);

  const minVal = 0;
  const maxVal = niceAxisMax(rawMax);

  const pts = points.map((p, i) => {
    const x = padL + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2);
    const ratio = (p.value - minVal) / (maxVal - minVal || 1);
    const y = padT + chartH - ratio * chartH;
    return { ...p, x, y: hasSpend ? y : padT + chartH, origValue: p.value };
  });

  const buildPath = (segment: typeof pts) => {
    if (segment.length === 0) return '';
    let d = `M ${segment[0].x} ${segment[0].y}`;
    for (let i = 0; i < segment.length - 1; i++) {
      const p0 = segment[Math.max(i - 1, 0)];
      const p1 = segment[i];
      const p2 = segment[i + 1];
      const p3 = segment[Math.min(i + 2, segment.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const actualPts = pts.filter((p) => !p.isProjected);
  const projectedPts = pts.filter((p) => p.isProjected);
  const actualPath = buildPath(actualPts.length ? actualPts : []);
  const projectedPath = buildPath(projectedPts.length >= 2 ? projectedPts : pts.length >= 2 ? pts : []);
  const fullPath = buildPath(pts);

  const areaD = hasSpend
    ? `${fullPath} L ${pts[pts.length - 1]?.x || 0} ${padT + chartH} L ${pts[0]?.x || 0} ${padT + chartH} Z`
    : '';

  const yTicks = [0, 0.5, 1].map((r) => {
    const val = Math.round(minVal + r * (maxVal - minVal));
    const y = padT + chartH - r * chartH;
    return { val, y };
  });

  const activePt = hoverIdx !== null ? pts[hoverIdx] : pts.find((p) => p.period === current) || pts[pts.length - 1];

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-2 px-0.5 gap-2 text-[10px]">
        <span className="font-bold text-slate-700">
          {activePt ? money(activePt.origValue) : '—'}
          {activePt?.isProjected ? ' · est.' : ''}
        </span>
        <div className="flex items-center gap-3 text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Actual
          </span>
          {points.some((p) => p.isProjected) && (
            <span className="flex items-center gap-1">
              <span className="w-4 border-t border-dashed border-slate-400" /> Est.
            </span>
          )}
        </div>
      </div>

      <div className="relative w-full h-[132px]">
        {!hasSpend && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-center px-4 bg-white/75 backdrop-blur-[1px] rounded-lg">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <p className="text-xs text-slate-600">No payroll data — run a payrun or adjust filters</p>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goldGradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                y1={t.y}
                x2={W - padR}
                y2={t.y}
                stroke="#ebe5dc"
                strokeDasharray={idx === 0 ? undefined : '4 4'}
                strokeWidth="1"
              />
              <text x={padL - 10} y={t.y + 3.5} textAnchor="end" fontSize="10" fontWeight="600" fill="#8c7f75">
                {compactMoney(t.val)}
              </text>
            </g>
          ))}

          <path d={areaD} fill="url(#goldGradientArea)" />

          {actualPath && !allProjected && (
            <path
              d={actualPath}
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {(allProjected || projectedPts.length >= 2) && (
            <path
              d={allProjected ? fullPath : projectedPath}
              fill="none"
              stroke={allProjected ? '#d97706' : '#94a3b8'}
              strokeWidth={allProjected ? 2.5 : 2}
              strokeDasharray={allProjected ? undefined : '6 5'}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={allProjected ? 1 : 0.85}
            />
          )}

          {activePt && hasSpend && (
            <line
              x1={activePt.x}
              y1={padT}
              x2={activePt.x}
              y2={padT + chartH}
              stroke="#b45309"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {pts.map((p, idx) => {
            const isSelected = p.period === current;
            const isHov = hoverIdx === idx;
            return (
              <g
                key={p.period}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                onClick={() => onPoint?.(p.period)}
              >
                <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                {(isSelected || isHov) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHov ? '8' : '6'}
                    fill={p.isProjected ? '#94a3b8' : '#d97706'}
                    fillOpacity="0.25"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected || isHov ? '4' : '3'}
                  fill={isSelected || isHov ? (p.isProjected ? '#64748b' : '#d97706') : '#ffffff'}
                  stroke={p.isProjected ? '#94a3b8' : '#d97706'}
                  strokeWidth={isSelected || isHov ? '2' : '1.5'}
                />
                <text
                  x={p.x}
                  y={padT + chartH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight={isSelected || isHov ? '700' : '500'}
                  fill={isSelected || isHov ? '#1a1a1a' : '#8c7f75'}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function TimelineSlider({
  months,
  period,
  value,
  onChange,
}: {
  months: string[];
  period: string;
  value: number;
  onChange: (index: number) => void;
}) {
  const selected = months[value] ?? period;
  const activePoint = months.includes(period) ? period : selected;

  return (
    <div className="rounded-xl border border-[#e5ded4] bg-[#faf7f3]/60 px-3 py-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="inline-flex items-center justify-center size-7 rounded-lg border border-[#e5ded4] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex-1 text-center min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected period</p>
          <p className="text-sm font-black text-slate-900 truncate">{niceMonth(activePoint)}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(months.length - 1, value + 1))}
          disabled={value >= months.length - 1}
          className="inline-flex items-center justify-center size-7 rounded-lg border border-[#e5ded4] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          aria-label="Next month"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <Slider
        min={0}
        max={Math.max(0, months.length - 1)}
        step={1}
        value={[value]}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v;
          if (typeof next === 'number') onChange(next);
        }}
        className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-slate-200 [&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-amber-500 [&_[data-slot=slider-thumb]]:shadow-sm"
        aria-label="Payroll timeline"
      />

      <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-0.5">
        <span>{months[0] ? monthShort(months[0]) : ''}</span>
        <span>{months[months.length - 1] ? monthShort(months[months.length - 1]) : ''}</span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
        {months.map((m, idx) => {
          const isActive = m === period;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(idx)}
              className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-[#e5ded4] text-slate-500 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {monthShort(m)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface NetSalaryTrendChartProps {
  points: TrendPoint[];
  period: string;
  timelineMonths: string[];
  timelineIndex: number;
  onPeriodChange: (period: string) => void;
}

export function NetSalaryTrendChart({
  points,
  period,
  timelineMonths,
  timelineIndex,
  onPeriodChange,
}: NetSalaryTrendChartProps) {
  return (
    <>
      <SmoothLineTrendChart points={points} current={period} onPoint={onPeriodChange} />
      <TimelineSlider
        months={timelineMonths}
        period={period}
        value={timelineIndex}
        onChange={(idx) => onPeriodChange(timelineMonths[idx] ?? period)}
      />
    </>
  );
}
