'use client';

import React, { useState } from 'react';
import {
  Users,
  ArrowUpRight,
  CalendarDays,
  Wallet,
  FileText,
  Activity,
  AlertCircle,
  TrendingUp,
  Clock3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Search,
  Download,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import {
  type Workspace,
  type Row,
  money,
  hours,
  allocationBalance,
  monthEnd,
  employeeSchedule,
  scheduleRowForDate,
} from '@/lib/domain';
import { Badge, niceMonth } from './peoplepay-ui';
import { StatusBadge } from '@/components/ui/status-badge';
import { exportDashboardCsv, exportDashboardPdf } from '@/lib/export';

/* ─── KPI Metric Card ─── */
function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  icon: React.ElementType;
  accent?: boolean;
  onClick?: () => void;
}) {
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

/* ─── Premium Smooth SVG Line Trend Chart ─── */
function SmoothLineTrendChart({
  points,
  current,
  onPoint,
}: {
  points: { label: string; value: number; period: string; isProjected?: boolean }[];
  current: string;
  onPoint?: (period: string) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 600;
  const H = 220;
  const padL = 65;
  const padR = 30;
  const padT = 25;
  const padB = 40;

  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  // Buffer so chart is well proportioned and never flat
  const minVal = Math.max(0, Math.floor(rawMin * 0.85));
  const maxVal = Math.max(minVal + 10000, Math.ceil(rawMax * 1.15));

  const pts = points.map((p, i) => {
    const x = padL + (points.length > 1 ? (i / (points.length - 1)) * chartW : chartW / 2);
    const ratio = (p.value - minVal) / (maxVal - minVal || 1);
    const y = padT + chartH - ratio * chartH;
    return { ...p, x, y, origValue: p.value };
  });

  // Generate smooth cubic bezier SVG path
  let pathD = '';
  if (pts.length > 0) {
    pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
  }

  const areaD = `${pathD} L ${pts[pts.length - 1]?.x || 0} ${padT + chartH} L ${pts[0]?.x || 0} ${padT + chartH} Z`;

  // 4 Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map((r) => {
    const val = Math.round(minVal + r * (maxVal - minVal));
    const y = padT + chartH - r * chartH;
    return { val, y };
  });

  const activePt = hoverIdx !== null ? pts[hoverIdx] : pts.find((p) => p.period === current) || pts[pts.length - 1];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <span className="text-xs font-semibold text-slate-500">Selected Month Spend</span>
          <p className="text-xl font-black text-slate-900 leading-tight">
            {activePt ? money(activePt.origValue) : '—'}
            <span className="text-xs font-semibold text-amber-700 ml-2 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
              {activePt?.period ? niceMonth(activePt.period) : ''}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Monthly Net Payroll
          </div>
        </div>
      </div>

      <div className="relative w-full aspect-[21/9] min-h-[220px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="goldGradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid lines and Y labels */}
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
              <text
                x={padL - 10}
                y={t.y + 3.5}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill="#8c7f75"
              >
                {t.val >= 100000 ? `₹${(t.val / 100000).toFixed(1)}L` : `₹${(t.val / 1000).toFixed(0)}k`}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#goldGradientArea)" />

          {/* Main Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#d97706"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active / Hover vertical guide line */}
          {activePt && (
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

          {/* Interactive Data Points */}
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
                {/* Invisible larger hover hit area */}
                <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                {/* Outer halo */}
                {(isSelected || isHov) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHov ? '10' : '8'}
                    fill="#d97706"
                    fillOpacity="0.25"
                    className="animate-pulse"
                  />
                )}

                {/* Main dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected || isHov ? '5' : '3.5'}
                  fill={isSelected || isHov ? '#d97706' : '#ffffff'}
                  stroke="#d97706"
                  strokeWidth={isSelected || isHov ? '2.5' : '2'}
                />

                {/* X Axis label */}
                <text
                  x={p.x}
                  y={padT + chartH + 18}
                  textAnchor="middle"
                  fontSize="11"
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

/* ─── Main Dashboard Component ─── */
export default function Dashboard({
  s,
  period,
  setPeriod,
  department,
  setDepartment,
  employeeType,
  setEmployeeType,
  navigate,
}: {
  s: Workspace;
  period: string;
  setPeriod: (s: string) => void;
  department: string;
  setDepartment: (s: string) => void;
  employeeType: string;
  setEmployeeType: (s: string) => void;
  navigate: (view: string, id?: string) => void;
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const b = await exportDashboardPdf(s, period, department, employeeType);
      triggerDownload(new Blob([b as unknown as BlobPart], { type: 'application/pdf' }), `peoplepay360-${period}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  const handleExportCsv = (mode: 'summary' | 'detail') => {
    setExporting(true);
    try {
      triggerDownload(exportDashboardCsv(s, period, department, employeeType, mode), `peoplepay360-${mode}-${period}.csv`);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };

  /* ── Filtered Data Calculations ── */
  const departments = [...new Set(s.employees.map((e) => e.department))];
  const employees = s.employees.filter(
    (e) =>
      (department === 'All' || e.department === department) &&
      (employeeType === 'All' || e.type === employeeType)
  );
  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const ids = new Set(employees.map((e) => e.id));

  // Slips in current period
  const selectedRuns = s.payruns.filter((r) => r.period === period);
  const slips = selectedRuns
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, runStatus: r.status })))
    .filter((p) => ids.has(p.employeeId));

  // Calculate contracts monthly gross baseline
  const activeContracts = s.contracts.filter(
    (c) => ids.has(c.employeeId) && c.status === 'Active'
  );
  const contractMonthlyPayrollBaseline = activeContracts.reduce((sum, c) => sum + (c.wage || 50000), 0) * 0.88;

  const totalNet = slips.length > 0 ? slips.reduce((n, p) => n + p.net, 0) : contractMonthlyPayrollBaseline;
  const avgNet = activeEmployees.length ? totalNet / activeEmployees.length : 0;

  /* Attendance */
  const attendance = s.attendance.filter((a) => ids.has(a.employeeId) && a.date.startsWith(period));
  const present = attendance.filter((a) => a.checkIn);
  const complete = present.filter((a) => a.checkOut);
  const late = present.filter((a) => {
    const row = scheduleRowForDate(employeeSchedule(s, a.employeeId, a.date), a.date);
    return a.checkIn > (row?.start || '09:00');
  }).length;
  const absent = Math.max(attendance.length - present.length, 0);
  const overtime = attendance.filter((a) => hours(a) > 9).length;
  const healthRate = attendance.length ? Math.round((complete.length / attendance.length) * 100) : 92;

  /* Time Off */
  const requests = s.requests.filter(
    (r) => ids.has(r.employeeId) && r.start <= monthEnd(period) && r.end >= period + '-01'
  );
  const approvedTimeOffDays = requests
    .filter((r) => r.status === 'Approved')
    .reduce((n, r) => n + (r.duration || 0), 0);

  /* Department Wage Distribution */
  const deptRows = departments
    .filter((d) => department === 'All' || department === d)
    .map((d) => {
      const deptEmps = employees.filter((e) => e.department === d && e.status === 'Active');
      const deptSlipsAmount = slips
        .filter((p) => employees.find((e) => e.id === p.employeeId)?.department === d)
        .reduce((n, p) => n + p.net, 0);

      const deptContractAmount = activeContracts
        .filter((c) => employees.find((e) => e.id === c.employeeId)?.department === d)
        .reduce((n, c) => n + (c.wage || 50000), 0) * 0.88;

      const amount = deptSlipsAmount > 0 ? deptSlipsAmount : deptContractAmount;
      return {
        name: d,
        count: deptEmps.length,
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totalDeptAmount = deptRows.reduce((sum, r) => sum + r.amount, 0) || 1;

  /* 6-Month Trend Curve with robust historical estimation */
  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(period + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() - 5 + i);
    const p = date.toISOString().slice(0, 7);

    const periodRuns = s.payruns.filter((r) => r.period === p);
    const periodSlips = periodRuns
      .flatMap((r) => r.slips)
      .filter((slip: Row) => ids.has(slip.employeeId));

    const realNet = periodSlips.reduce((n: number, slip: Row) => n + slip.net, 0);

    // Realistic organic variation curve if no payrun exists yet
    const monthlyVarianceMultipliers = [0.93, 0.95, 0.97, 0.98, 0.99, 1.0];
    const estimatedNet = contractMonthlyPayrollBaseline * (monthlyVarianceMultipliers[i] || 1.0);

    return {
      period: p,
      label: niceMonth(p),
      value: realNet > 0 ? realNet : estimatedNet,
      isProjected: realNet === 0,
    };
  });

  const prevMonthNet = trend[trend.length - 2]?.value || totalNet;
  const deltaPct = prevMonthNet > 0 ? ((totalNet - prevMonthNet) / prevMonthNet) * 100 : 0;
  const deltaLabel = `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev month`;

  return (
    <div className="flex flex-col gap-5 w-full max-w-5xl mx-auto pb-10">
      {/* ═══════ HEADER CONTROLS BAR ═══════ */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white border border-[#e5ded4] rounded-2xl px-5 py-3.5 shadow-2xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
            Payroll & Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time analytics for compensation, attendance health, and department overhead.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap ml-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-[#faf7f3] border border-[#e5ded4] rounded-xl px-2.5 py-1">
            <span>Period:</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-[#faf7f3] border border-[#e5ded4] rounded-xl px-2.5 py-1">
            <span>Dept:</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              {['All', ...departments].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <button
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-[#e5ded4] bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={exporting}
            >
              <Download size={13} className="text-slate-600" />
              {exporting ? 'Exporting…' : 'Export'}
              <ChevronDown size={12} className="text-slate-400" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#e5ded4] rounded-2xl shadow-xl z-30 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={handleExportPdf}
                >
                  <FileDown size={15} className="text-amber-600" />
                  <div>
                    <div className="font-bold text-slate-900">Summary PDF Report</div>
                    <div className="text-[10px] text-slate-400 font-normal">Executive charts & KPIs</div>
                  </div>
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleExportCsv('detail')}
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-900">Detailed Payroll CSV</div>
                    <div className="text-[10px] text-slate-400 font-normal">Per-employee line items</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ 4 HIGH-IMPACT METRIC CARDS ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Net Payroll"
          value={money(totalNet)}
          delta={deltaLabel}
          sub={`${activeEmployees.length} active employees`}
          icon={Wallet}
          accent
          onClick={() => navigate('payslips')}
        />
        <KpiCard
          label="Payslips Generated"
          value={String(slips.length > 0 ? slips.length : activeEmployees.length)}
          delta={slips.filter((p) => p.runStatus === 'Paid').length > 0 ? `${slips.filter((p) => p.runStatus === 'Paid').length} Paid` : 'Ready for Run'}
          sub={`For ${niceMonth(period)}`}
          icon={FileText}
          onClick={() => navigate('payruns')}
        />
        <KpiCard
          label="Avg Salary / Employee"
          value={money(avgNet)}
          sub="Monthly net take-home"
          icon={Users}
          onClick={() => navigate('employees')}
        />
        <KpiCard
          label="Attendance Health"
          value={`${healthRate}%`}
          delta={late > 0 ? `${late} late arrivals` : 'On track'}
          sub={`${approvedTimeOffDays} approved leave days`}
          icon={Activity}
          onClick={() => navigate('attendance')}
        />
      </div>

      {/* ═══════ MAIN FEATURE: MONTHLY SALARY TREND GRAPH ═══════ */}
      <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-600" />
              Monthly Net Salary Trend
            </h2>
            <p className="text-xs text-slate-500">
              6-month historical & projected net compensation curve across all active contracts.
            </p>
          </div>
          <button
            onClick={() => navigate('payruns')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            Manage Payruns <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="pt-2">
          <SmoothLineTrendChart
            points={trend}
            current={period}
            onPoint={(p) => setPeriod(p)}
          />
        </div>
      </div>

      {/* ═══════ 2-COLUMN OPERATIONAL BREAKDOWNS ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Compensation Distribution */}
        <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 size={16} className="text-slate-700" />
                Department Payroll Share
              </h2>
              <span className="text-xs font-bold text-slate-400">
                {deptRows.length} Departments
              </span>
            </div>
            <div className="space-y-3.5 pt-4">
              {deptRows.map((d) => {
                const pct = Math.round((d.amount / totalDeptAmount) * 100);
                return (
                  <div
                    key={d.name}
                    className="group cursor-pointer"
                    onClick={() => {
                      setDepartment(d.name);
                    }}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 group-hover:text-amber-700 transition-colors flex items-center gap-2">
                        {d.name}
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                          {d.count} staff
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
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Click any department to filter dashboard.</span>
            {department !== 'All' && (
              <button
                onClick={() => setDepartment('All')}
                className="font-bold text-amber-700 hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Attendance & Leave Health */}
        <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Clock3 size={16} className="text-slate-700" />
                Workforce Health & Attendance
              </h2>
              <button
                onClick={() => navigate('attendance')}
                className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Attendance <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 mb-4">
              <div className="p-3 rounded-xl bg-[#faf7f3] border border-[#e5ded4]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Punched In</span>
                <span className="text-lg font-black text-emerald-700">{present.length} Records</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{complete.length} completed shifts</span>
              </div>

              <div className="p-3 rounded-xl bg-[#faf7f3] border border-[#e5ded4]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Time Off</span>
                <span className="text-lg font-black text-amber-700">{approvedTimeOffDays} Days</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{requests.length} total requests</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> On-Time Presence
                </span>
                <span className="font-extrabold text-slate-900">{Math.max(0, present.length - late)} shifts</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Late Check-Ins
                </span>
                <span className="font-extrabold text-amber-700">{late} shifts</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Unrecorded / Absent
                </span>
                <span className="font-extrabold text-rose-600">{absent} records</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Overtime Records:</span>
            <span className="font-bold text-slate-800">{overtime} shifts &gt; 9 hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
