'use client';

import { useEffect, useId, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { money } from '@/lib/domain';
import { niceMonth } from '@/components/peoplepay-ui';
import type { TrendPoint } from '@/lib/dashboard-types';

function compactRupees(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}k`;
  return `₹${Math.round(value)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function curvedPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    const minY = Math.min(current.y, next.y);
    const maxY = Math.max(current.y, next.y);
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp2x = next.x - (following.x - current.x) / 6;
    const cp1y = clamp(current.y + (next.y - previous.y) / 6, minY, maxY);
    const cp2y = clamp(next.y - (following.y - current.y) / 6, minY, maxY);
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function MonthlySalaryTrendCard({ points, period, onPeriodChange, onManagePayruns }: {
  points: TrendPoint[];
  period: string;
  onPeriodChange: (period: string) => void;
  onManagePayruns: () => void;
}) {
  const gradientId = useId().replace(/:/g, '');
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);
  const visibleCount = Math.min(6, points.length || 6);
  const maxWindowStart = Math.max(0, points.length - visibleCount);
  const periodIndex = Math.max(0, points.findIndex((point) => point.period === period));
  const initialWindowStart = Math.min(Math.max(0, periodIndex - visibleCount + 1), maxWindowStart);
  const [windowStart, setWindowStart] = useState(initialWindowStart);
  const safeWindowStart = Math.min(windowStart, maxWindowStart);
  const visiblePoints = points.slice(safeWindowStart, safeWindowStart + visibleCount);
  const activePeriod = hoveredPeriod || (visiblePoints.some((point) => point.period === period) ? period : visiblePoints.at(-1)?.period);
  const selectedPoint = visiblePoints.find((point) => point.period === activePeriod) || visiblePoints.at(-1);
  const rangeStart = visiblePoints[0];
  const rangeEnd = visiblePoints.at(-1);
  const width = 960;
  const height = 330;
  const padding = { top: 24, right: 68, bottom: 66, left: 98 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const plotBottom = padding.top + chartHeight;
  const values = visiblePoints.map((point) => point.value);
  const positiveValues = values.filter((value) => value > 0);
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values, 1) : 1;
  const positiveMin = positiveValues.length ? Math.min(...positiveValues) : rawMin;
  const displayFloor = positiveValues.length > 1 && positiveMin < rawMax * 0.22 ? rawMax * 0.58 : positiveMin;
  const scaleValues = values.map((value) => (value > 0 ? Math.max(value, displayFloor) : value));
  const scaleMin = scaleValues.length ? Math.min(...scaleValues) : 0;
  const scaleMax = scaleValues.length ? Math.max(...scaleValues, 1) : 1;
  const spread = Math.max(scaleMax - scaleMin, scaleMax * 0.12, 1);
  const axisMin = rawMin <= 0 ? 0 : Math.max(0, scaleMin - spread * 0.32);
  const axisMax = scaleMax + spread * 0.32;
  const valueToY = (value: number) => padding.top + chartHeight - ((value - axisMin) / (axisMax - axisMin)) * chartHeight;
  const coordinates = visiblePoints.map((point, index) => {
    const displayValue = point.value > 0 ? Math.max(point.value, displayFloor) : 0;
    return {
      ...point,
      x: padding.left + (visiblePoints.length > 1 ? (index / (visiblePoints.length - 1)) * chartWidth : chartWidth / 2),
      y: clamp(valueToY(displayValue), padding.top, plotBottom),
    };
  });
  const line = curvedPath(coordinates);
  const baseline = clamp(valueToY(0), padding.top, plotBottom);
  const area = line ? `${line} L ${coordinates.at(-1)?.x ?? padding.left} ${baseline} L ${coordinates[0]?.x ?? padding.left} ${baseline} Z` : '';
  const activeCoordinate = coordinates.find((point) => point.period === activePeriod) || coordinates.at(-1);
  const ticks = [1, 2 / 3, 1 / 3, 0].map((ratio) => {
    const value = axisMin + (axisMax - axisMin) * ratio;
    return { value, y: valueToY(value) };
  });
  const labelX = (padding.left - 18) / width * 100;
  const baselineLabelY = (plotBottom + 30) / height * 100;

  useEffect(() => {
    setWindowStart((current) => {
      if (periodIndex < 0) return Math.min(current, maxWindowStart);
      if (periodIndex < current) return periodIndex;
      if (periodIndex >= current + visibleCount) return Math.min(periodIndex - visibleCount + 1, maxWindowStart);
      return Math.min(current, maxWindowStart);
    });
  }, [maxWindowStart, periodIndex, visibleCount]);

  return (
    <section className="salary-trend-card">
      <header className="salary-trend-header">
        <div>
          <h2><TrendingUp size={17} aria-hidden="true" /> Monthly Net Salary Trend</h2>
          <p>12-month historical and projected net compensation curve across active contracts.</p>
        </div>
        <button type="button" onClick={onManagePayruns}>Manage Payruns <ArrowUpRight size={14} /></button>
      </header>

      <div className="salary-trend-summary">
        <div>
          <span>{hoveredPeriod ? 'Hovered Month Spend' : 'Selected Month Spend'}</span>
          <strong>{selectedPoint ? money(selectedPoint.value) : '₹0'}</strong>
          {selectedPoint && <em>{niceMonth(selectedPoint.period)}{selectedPoint.isProjected ? ' · Projected' : ''}</em>}
        </div>
        <span className="salary-trend-legend"><i /> Monthly Net Payroll</span>
      </div>

      {points.length > visibleCount && rangeStart && rangeEnd && (
        <div className="salary-trend-window-control">
          <button
            type="button"
            onClick={() => setWindowStart(Math.max(0, safeWindowStart - 1))}
            disabled={safeWindowStart === 0}
            aria-label="Previous payroll month range"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="salary-trend-window-range">{rangeStart.label} - {rangeEnd.label}</span>
          <Slider
            min={0}
            max={maxWindowStart}
            step={1}
            value={[safeWindowStart]}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              if (typeof next === 'number') setWindowStart(next);
            }}
            aria-label="Select visible payroll months"
          />
          <button
            type="button"
            onClick={() => setWindowStart(Math.min(maxWindowStart, safeWindowStart + 1))}
            disabled={safeWindowStart === maxWindowStart}
            aria-label="Next payroll month range"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      <div className="salary-trend-plot">
        <div className="salary-trend-plot-frame">
          <svg viewBox={`0 0 ${width} ${height}`} aria-label="Monthly net salary trend" preserveAspectRatio="none">
            <title>Monthly net salary trend</title>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.24" />
                <stop offset="58%" stopColor="#f59e0b" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick, index) => (
              <g key={index}>
                <line x1={padding.left} y1={tick.y} x2={width - padding.right} y2={tick.y} className={index === ticks.length - 1 ? 'axis-line' : 'grid-line'} />
              </g>
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <line x1={padding.left} y1={baseline} x2={width - padding.right} y2={baseline} className="axis-line zero-axis-line" />
            <path d={line} className="salary-line" />
            {activeCoordinate && <line x1={activeCoordinate.x} y1={padding.top} x2={activeCoordinate.x} y2={plotBottom} className="selection-line" />}
            {coordinates.map((point) => {
              const active = point.period === activePeriod;
              return (
                <a
                  key={point.period}
                  className="salary-point"
                  href="#payroll/dashboard"
                  aria-label={`${niceMonth(point.period)}, ${money(point.value)}${point.isProjected ? ', projected' : ''}`}
                  onClick={(event) => { event.preventDefault(); onPeriodChange(point.period); }}
                  onMouseEnter={() => setHoveredPeriod(point.period)}
                  onMouseLeave={() => setHoveredPeriod(null)}
                  onFocus={() => setHoveredPeriod(point.period)}
                  onBlur={() => setHoveredPeriod(null)}
                >
                  <g>
                    <circle cx={point.x} cy={point.y} r="17" fill="transparent" />
                    {active && <circle cx={point.x} cy={point.y} r="11" className="point-halo" />}
                    <circle cx={point.x} cy={point.y} r={active ? 7 : 5.5} className={active ? 'point-dot active' : 'point-dot'} />
                  </g>
                </a>
              );
            })}
          </svg>
          <div className="salary-trend-axis-labels" aria-hidden="true">
            {ticks.map((tick, index) => (
              <span
                key={index}
                className="axis-label"
                style={{ left: `${labelX}%`, top: `${tick.y / height * 100}%` }}
              >
                {compactRupees(tick.value)}
              </span>
            ))}
          </div>
          <div className="salary-trend-month-labels" aria-hidden="true">
            {coordinates.map((point, index) => {
              const active = point.period === activePeriod;
              const edgeClass = index === 0 ? ' first' : index === coordinates.length - 1 ? ' last' : '';
              return (
                <span
                  key={point.period}
                  className={`${active ? 'month-label active' : 'month-label'}${edgeClass}`}
                  style={{ left: `${point.x / width * 100}%`, top: `${baselineLabelY}%` }}
                >
                  {point.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
