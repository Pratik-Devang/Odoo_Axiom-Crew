'use client';
import React, { useState } from 'react';
import {
  Users, ArrowUpRight, CalendarDays, Wallet, FileText, Activity,
  AlertCircle, TrendingUp, Clock3, Building2, CheckCircle2,
  ChevronRight, Search, UserCircle2, BadgeCheck, X,
  Download, FileSpreadsheet, FileDown, ChevronDown, Info,
  BarChart2, Layers,
} from 'lucide-react';
import {
  type Workspace, type Row, money, hours, allocationBalance,
  monthEnd, employeeSchedule, scheduleRowForDate, workingDaysBetween,
} from '@/lib/domain';
import { Picker, Badge, niceMonth } from './peoplepay-ui';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { exportDashboardCsv, exportDashboardPdf } from '@/lib/export';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

/* ─── Tiny Tooltip on hover ─── */
function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={11} className="text-slate-400 cursor-help" />
      <span className="absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap
        bg-[#1a1a1a] text-white text-[10px] font-medium px-2 py-1 rounded-lg
        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
        {text}
      </span>
    </span>
  );
}

/* ─── Panel card shell ─── */
function Panel({ title, subtitle, tip, action, actionLabel, children, className = '' }: {
  title: string; subtitle?: string; tip?: string;
  action?: () => void; actionLabel?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white border border-[#e5ded4] rounded-2xl flex flex-col overflow-hidden shadow-xs ${className}`}>
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-[#f0ebe3] flex-shrink-0">
        <div>
          <p className="text-xs font-bold text-[#1a1a1a] flex items-center gap-1.5">
            {title} {tip && <Tip text={tip} />}
          </p>
          {subtitle && <p className="text-[10px] text-[#9c8f85] mt-0.5">{subtitle}</p>}
        </div>
        {action && (
          <button
            onClick={action}
            className="text-[10px] font-semibold text-[#5a5047] hover:text-[#1a1a1a]
              inline-flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
          >
            {actionLabel || 'Open'} <ArrowUpRight size={10} />
          </button>
        )}
      </div>
      <div className="p-4 flex-1 min-h-0">{children}</div>
    </div>
  );
}

/* ─── KPI Metric Card ─── */
function KpiCard({ label, value, sub, delta, icon: Icon, accent, onClick, tip }: {
  label: string; value: string; sub?: string; delta?: string;
  icon: React.ElementType; accent?: boolean;
  onClick?: () => void; tip?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left flex flex-col gap-2 cursor-pointer
        transition-all hover:shadow-sm hover:scale-[1.01] active:scale-100
        ${accent
          ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white'
          : 'bg-white border-[#e5ded4] hover:border-[#c4b8aa]'
        }`}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${accent ? 'text-slate-400' : 'text-[#9c8f85]'}`}>
          {label} {tip && <Tip text={tip} />}
        </span>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center
          ${accent ? 'bg-white/10' : 'bg-[#f0ebe3]'}`}>
          <Icon size={14} className={accent ? 'text-[#e9b84a]' : 'text-[#5a5047]'} />
        </div>
      </div>
      <span className={`text-2xl font-extrabold tracking-tight leading-none
        ${accent ? 'text-white' : 'text-[#1a1a1a]'}`}>
        {value}
      </span>
      {(sub || delta) && (
        <div className="flex items-center gap-2 flex-wrap">
          {delta && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
              ${delta.startsWith('+')
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : delta.startsWith('-') && !delta.includes('vs')
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-[#fdf3d7] text-[#c99a2e] border border-[#e9b84a]'
              }`}>{delta}</span>
          )}
          {sub && <span className={`text-[10px] ${accent ? 'text-slate-400' : 'text-[#9c8f85]'}`}>{sub}</span>}
        </div>
      )}
    </button>
  );
}

/* ─── Vertical Bar Chart ─── */
function VerticalBarChart({ bars, maxVal, onBar }: {
  bars: { label: string; value: number; display: string; color?: string }[];
  maxVal: number;
  onBar?: (label: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="flex items-end justify-around gap-1 h-full w-full">
      {bars.map((b) => {
        const pct = maxVal > 0 ? Math.max(4, Math.round((b.value / maxVal) * 100)) : 4;
        const isH = hover === b.label;
        return (
          <div key={b.label}
            className="flex flex-col items-center flex-1 h-full justify-end gap-1 cursor-pointer group"
            onMouseEnter={() => setHover(b.label)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onBar?.(b.label)}
            title={`${b.label}: ${b.display}`}
          >
            <span className={`text-[9px] font-bold transition-opacity ${isH ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#5a5047]`}>
              {b.display}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-300"
              style={{
                height: `${pct}%`,
                background: isH ? '#c99a2e' : (b.color || '#5a5047'),
                maxWidth: 36,
              }}
            />
            <span className={`text-[9px] text-center leading-tight transition-colors ${isH ? 'text-[#c99a2e] font-bold' : 'text-[#9c8f85]'}`}
              style={{ maxWidth: 40 }}>
              {b.label.length > 6 ? b.label.slice(0, 6) + '.' : b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Line Trend Chart ─── */
function LineTrendChart({ points, maxVal, current, onPoint }: {
  points: { label: string; value: number; period: string }[];
  maxVal: number; current: string;
  onPoint?: (period: string) => void;
}) {
  const W = 100; const H = 80;
  const pts = points.map((p, i) => {
    const x = points.length > 1 ? (i / (points.length - 1)) * W : W / 2;
    const y = maxVal > 0 ? H - Math.max(4, (p.value / maxVal) * (H - 8)) : H - 4;
    return { ...p, x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  const [hov, setHov] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <svg viewBox={`0 0 100 ${H}`} className="w-full flex-1" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e9b84a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#e9b84a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendGrad)" />
        <path d={path} fill="none" stroke="#c99a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle
            key={p.period}
            cx={p.x} cy={p.y} r={p.period === current ? 3 : 2}
            fill={p.period === current ? '#c99a2e' : '#fff'}
            stroke="#c99a2e" strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHov(p.period)}
            onMouseLeave={() => setHov(null)}
            onClick={() => onPoint?.(p.period)}
          />
        ))}
        {hov && (() => {
          const pt = pts.find(p => p.period === hov);
          if (!pt) return null;
          return (
            <g>
              <rect x={Math.min(pt.x - 14, 72)} y={pt.y - 14} width={28} height={11}
                rx="2" fill="#1a1a1a" />
              <text x={Math.min(pt.x, 86)} y={pt.y - 6} textAnchor="middle"
                fill="white" fontSize="5" fontWeight="bold">
                {money(pt.value)}
              </text>
            </g>
          );
        })()}
      </svg>
      <div className="flex justify-between mt-2 flex-shrink-0">
        {pts.map((p) => (
          <button
            key={p.period}
            onClick={() => onPoint?.(p.period)}
            className={`text-[9px] transition-colors cursor-pointer ${p.period === current ? 'text-[#c99a2e] font-bold' : 'text-[#c4b8aa] hover:text-[#5a5047]'}`}
          >
            {p.label.slice(0, 3)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Stacked Status Bar ─── */
function StackedBar({ segments }: { segments: { label: string; count: number; color: string }[] }) {
  const total = segments.reduce((n, s) => n + s.count, 0) || 1;
  return (
    <div>
      <div className="flex h-4 w-full rounded-full overflow-hidden border border-[#e5ded4]">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.count / total) * 100}%`, background: s.color }}
            title={`${s.label}: ${s.count}`}
            className="transition-all duration-500"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[10px] text-[#5a5047]">{s.label} <span className="font-bold">{s.count}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Dashboard Component ─── */
export default function Dashboard({
  s, period, setPeriod, department, setDepartment, employeeType, setEmployeeType, navigate,
}: {
  s: Workspace; period: string;
  setPeriod: (s: string) => void;
  department: string; setDepartment: (s: string) => void;
  employeeType: string; setEmployeeType: (s: string) => void;
  navigate: (view: string, id?: string) => void;
}) {
  /* ── Filters & state ── */
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const b = await exportDashboardPdf(s, period, department, employeeType);
      triggerDownload(new Blob([b as unknown as BlobPart], { type: 'application/pdf' }), `pp360-${period}.pdf`);
    } catch (e) { console.error(e); }
    finally { setExporting(false); setExportMenuOpen(false); }
  };
  const handleExportCsv = (mode: 'summary' | 'detail') => {
    setExporting(true);
    try {
      triggerDownload(exportDashboardCsv(s, period, department, employeeType, mode), `pp360-${mode}-${period}.csv`);
    } catch (e) { console.error(e); }
    finally { setExporting(false); setExportMenuOpen(false); }
  };

  /* ── Data derivation ── */
  const departments = [...new Set(s.employees.map((e) => e.department))];
  const employees = s.employees.filter(
    (e) => (department === 'All' || e.department === department)
          && (employeeType === 'All' || e.type === employeeType)
  );
  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const ids = new Set(employees.map((e) => e.id));

  const selectedRuns = s.payruns.filter((r) => r.period === period);
  const slips = selectedRuns
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, runStatus: r.status })))
    .filter((p) => ids.has(p.employeeId));

  const totalNet = slips.reduce((n, p) => n + p.net, 0);
  const avgNet = slips.length ? totalNet / slips.length : 0;

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
  const health = attendance.length ? Math.round((complete.length / attendance.length) * 100) : 0;

  /* Time Off */
  const requests = s.requests.filter(
    (r) => ids.has(r.employeeId) && r.start <= monthEnd(period) && r.end >= period + '-01'
  );
  const approvedTimeOffDays = requests
    .filter((r) => r.status === 'Approved')
    .reduce((n, r) => n + (r.duration || 0), 0);

  /* Dept rows */
  const deptRows = departments
    .filter((d) => department === 'All' || department === d)
    .map((d) => ({
      name: d,
      count: employees.filter((e) => e.department === d && e.status === 'Active').length,
      amount: slips.filter((p) => employees.find((e) => e.id === p.employeeId)?.department === d)
        .reduce((n, p) => n + p.net, 0),
    }))
    .sort((a, b) => b.amount - a.amount);
  const maxDept = Math.max(...deptRows.map((r) => r.amount), 1);

  /* Trend (6 months) */
  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(period + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() - 5 + i);
    const p = date.toISOString().slice(0, 7);
    return {
      period: p,
      label: niceMonth(p).split(' ')[0],
      value: s.payruns.filter((r) => r.period === p && r.status === 'Paid')
        .flatMap((r) => r.slips).filter((p: Row) => ids.has(p.employeeId))
        .reduce((n: number, p: Row) => n + p.net, 0),
    };
  });
  const trendMax = Math.max(...trend.map((t) => t.value), 1);



  /* Payslip status split */
  const statusSplit = [
    { label: 'Paid', count: slips.filter((p) => p.runStatus === 'Paid').length, color: '#22c55e' },
    { label: 'Validated', count: slips.filter((p) => p.runStatus === 'Validated').length, color: '#60a5fa' },
    { label: 'Pending', count: slips.filter((p) => p.runStatus === 'Computed').length, color: '#e9b84a' },
    { label: 'Draft', count: slips.filter((p) => p.runStatus === 'Draft').length, color: '#d1d5db' },
  ];

  /* Alerts */
  const bankMissing = employees.filter((e) => e.status === 'Active' && !e.bank);
  const drafts = selectedRuns.filter((r) => r.status !== 'Paid' && r.employeeIds.some((id: string) => ids.has(id)));
  const expiring = s.contracts.filter((c) => ids.has(c.employeeId) && c.end && c.end.startsWith(period));
  const dupWarn = slips.length > activeEmployees.length;

  const alerts: { text: string; color: string; action: () => void }[] = [
    ...(bankMissing.length ? [{
      text: `+ ${bankMissing.length} employees missing bank account`,
      color: '#f87171', action: () => navigate('employees', bankMissing[0].id),
    }] : []),
    ...(dupWarn ? [{
      text: '+ 1 duplicate payslip warning',
      color: '#e9b84a', action: () => navigate('payruns'),
    }] : []),
    ...(drafts.length ? [{
      text: `+ ${drafts.filter(r => r.status === 'Draft' || r.status === 'Computed').length} drafts still not validated`,
      color: '#9c8f85', action: () => navigate('payruns'),
    }] : []),
    ...(expiring.length ? [{
      text: `+ ${expiring.length} contracts expiring this month`,
      color: '#9c8f85', action: () => navigate('contracts'),
    }] : []),
  ];

  /* Leave type balances */
  const leaveRows = s.leaveTypes.map((t) => {
    const approved = requests.filter((r) => r.typeId === t.id && r.status === 'Approved')
      .reduce((n, r) => n + (r.duration || 0), 0);
    const pending = requests.filter((r) => r.typeId === t.id && r.status === 'Pending').length;
    const balance = t.requiresAllocation
      ? s.allocations.filter((a) =>
          a.typeId === t.id && ids.has(a.employeeId) &&
          a.start <= period + '-01' && a.end >= monthEnd(period))
        .reduce((n, a) => n + allocationBalance(s, a), 0)
      : null;
    return { name: t.name, unit: t.unit, approved, pending, balance };
  });

  /* Employee drawer data */
  const selectedEmp = selectedId ? s.employees.find((e) => e.id === selectedId) : null;
  const filteredEmps = employees.filter(
    (e) => e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
            e.department.toLowerCase().includes(empSearch.toLowerCase())
  );

  /* Previous month delta */
  const prevPeriodDate = new Date(period + '-01T00:00:00Z');
  prevPeriodDate.setUTCMonth(prevPeriodDate.getUTCMonth() - 1);
  const prevPeriod = prevPeriodDate.toISOString().slice(0, 7);
  const prevNet = s.payruns.filter((r) => r.period === prevPeriod)
    .flatMap((r) => r.slips).filter((p: Row) => ids.has(p.employeeId))
    .reduce((n: number, p: Row) => n + p.net, 0);
  const deltaPct = prevNet > 0 ? ((totalNet - prevNet) / prevNet) * 100 : 0;
  const deltaLabel = prevNet > 0 ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev month` : '';

  return (
    <div className="flex flex-col gap-4 w-full min-h-0">

      {/* ═══════ TOPBAR: Filters + Export ═══════ */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-[#e5ded4] rounded-2xl px-5 py-3 shadow-xs">
        <div>
          <p className="text-base font-extrabold text-[#1a1a1a] leading-none">Payroll Dashboard</p>
          <p className="text-[10px] text-[#9c8f85] mt-0.5">
            Dashboard combines Payroll with HR data from multiple modules.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-[#5a5047] font-medium">
            <span>Period</span>
            <input
              type="month" value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-7 px-2 rounded-lg border border-[#e5ded4] text-xs text-slate-800 bg-[#faf7f3] w-32 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#5a5047] font-medium">
            <span>Department</span>
            <select
              value={department} onChange={(e) => setDepartment(e.target.value)}
              className="h-7 px-2 rounded-lg border border-[#e5ded4] text-xs text-slate-800 bg-[#faf7f3] focus:outline-none cursor-pointer"
            >
              {['All', ...departments].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#5a5047] font-medium">
            <span>Employee Type</span>
            <select
              value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}
              className="h-7 px-2 rounded-lg border border-[#e5ded4] text-xs text-slate-800 bg-[#faf7f3] focus:outline-none cursor-pointer"
            >
              {['All', 'Full-time', 'Part-time', 'Intern', 'Contract'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          {/* Export dropdown */}
          <div className="relative">
            <button
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[#e5ded4] bg-[#faf7f3] hover:bg-[#ede7de] text-xs font-semibold text-[#1a1a1a] transition-colors cursor-pointer"
              onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={exporting}
            >
              <Download size={13} className="text-[#5a5047]" />
              {exporting ? 'Exporting…' : 'Export'}
              <ChevronDown size={11} className="text-[#9c8f85]" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5ded4] rounded-2xl shadow-xl z-30 p-1.5 text-xs">
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium hover:bg-[#faf7f3] transition-colors cursor-pointer" onClick={handleExportPdf}>
                  <FileDown size={14} className="text-[#c99a2e]" />
                  <div><div className="font-semibold">Summary PDF</div><div className="text-[10px] text-[#9c8f85]">KPIs & charts overview</div></div>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium hover:bg-[#faf7f3] transition-colors cursor-pointer" onClick={() => handleExportCsv('detail')}>
                  <FileSpreadsheet size={14} className="text-emerald-600" />
                  <div><div className="font-semibold">Detailed CSV</div><div className="text-[10px] text-[#9c8f85]">Per-employee payslip data</div></div>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium hover:bg-[#faf7f3] transition-colors cursor-pointer" onClick={() => handleExportCsv('summary')}>
                  <FileText size={14} className="text-[#5a5047]" />
                  <div><div className="font-semibold">Dept Summary CSV</div><div className="text-[10px] text-[#9c8f85]">Aggregated cost tables</div></div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ ROW 1: 5 KPI Metric Cards ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total Net Salary Paid"
          value={money(totalNet)}
          delta={deltaLabel || undefined}
          sub="Across selected period"
          icon={Wallet} accent
          onClick={() => navigate('payslips')}
          tip="Source: Payslips · Payruns"
        />
        <KpiCard
          label="Payslips Generated"
          value={String(slips.length)}
          sub={`${slips.filter(p => p.runStatus !== 'Paid').length} pcs & pending`}
          delta={slips.filter(p => p.runStatus === 'Paid').length + ' paid'}
          icon={FileText}
          onClick={() => navigate('payruns')}
          tip="Source: Payruns → Payslips"
        />
        <KpiCard
          label="Avg Salary / Employee"
          value={money(avgNet)}
          sub="Based on active payrun"
          icon={Users}
          onClick={() => navigate('payslips')}
          tip="Net pay ÷ generated payslips"
        />
        <KpiCard
          label="Approved Time Off Days"
          value={`${approvedTimeOffDays} Days`}
          sub="Across selected period"
          icon={CalendarDays}
          onClick={() => navigate('requests')}
          tip="Source: Time Off Requests"
        />
        <KpiCard
          label="Attendance Health"
          value={`${health}%`}
          sub="Present · reviewed records"
          delta={late > 0 ? `${late} late` : undefined}
          icon={Activity}
          onClick={() => navigate('attendance')}
          tip="Complete punches ÷ total attendance"
        />
      </div>

      {/* ═══════ ROW 2: 3-Column Main Charts ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Salary Cost by Department — Vertical Bar Chart */}
        <Panel
          className="lg:col-span-4"
          title="Salary Cost by Department"
          subtitle="Source: Payslips + Employee.Department"
          tip="Gross salary summed per department"
          action={() => navigate('payslips')}
          actionLabel="View Payslips"
        >
          <div className="h-44">
            {deptRows.length > 0 && slips.length > 0 ? (
              <VerticalBarChart
                bars={deptRows.map((d) => ({
                  label: d.name,
                  value: d.amount,
                  display: money(d.amount),
                  color: '#5a5047',
                }))}
                maxVal={maxDept}
                onBar={(name) => navigate('payslips', 'dept:' + name)}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <BarChart2 size={28} className="text-[#e5ded4]" />
                <p className="text-[11px] text-[#c4b8aa] text-center">Compute a payrun to see<br />department cost breakdown</p>
              </div>
            )}
          </div>
        </Panel>

        {/* Monthly Net Salary Trend — Line Chart */}
        <Panel
          className="lg:col-span-4"
          title="Monthly Net Salary Trend"
          subtitle="Source: Historical Payslips + Payruns"
          tip="Paid payslips only · click a point to switch period"
          action={() => navigate('payruns')}
          actionLabel="All Payruns"
        >
          <div className="h-44">
            <LineTrendChart
              points={trend}
              maxVal={trendMax}
              current={period}
              onPoint={(p) => setPeriod(p)}
            />
          </div>
        </Panel>

        {/* Payslip Status & Payroll Alerts */}
        <Panel
          className="lg:col-span-4"
          title="Payslip Status & Payroll Alerts"
          subtitle="Source: Payrun + Payslip validation"
          tip="Live status split from all payruns this period"
          action={() => navigate('payruns')}
          actionLabel="Open Payruns"
        >
          <div className="flex flex-col gap-3 h-44 overflow-y-auto">
            <div>
              <p className="text-[10px] font-bold text-[#9c8f85] uppercase tracking-widest mb-2">Status Split</p>
              <StackedBar segments={statusSplit} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#9c8f85] uppercase tracking-widest mb-2">Current Alerts</p>
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-[11px] text-emerald-700 font-medium">All caught up for {niceMonth(period)}!</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {alerts.map((a, i) => (
                    <button key={i} onClick={a.action}
                      className="w-full text-left text-[11px] font-medium hover:underline cursor-pointer transition-colors flex items-center gap-1.5"
                      style={{ color: a.color }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      {a.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* ═══════ ROW 3: 4-Column Bottom Data Panels ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Attendance Overview — Small bar chart */}
        <Panel
          title="Attendance Overview"
          subtitle="Source: Attendance"
          tip="Attendance punch records for the selected period"
          action={() => navigate('attendance')}
          actionLabel="View All"
        >
          <div className="space-y-2">
            {[
              { label: 'Present', val: present.length, total: attendance.length || 1, color: '#22c55e' },
              { label: 'Late', val: late, total: attendance.length || 1, color: '#e9b84a' },
              { label: 'Absent', val: absent, total: attendance.length || 1, color: '#f87171' },
              { label: 'Overtime', val: overtime, total: attendance.length || 1, color: '#60a5fa' },
            ].map((row) => (
              <button
                key={row.label}
                onClick={() => navigate('attendance', 'stat:' + row.label.toLowerCase())}
                className="w-full group cursor-pointer"
                title={`View ${row.label} records`}
              >
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="font-semibold text-[#5a5047] group-hover:text-[#1a1a1a] transition-colors">{row.label}</span>
                  <span className="font-bold text-[#1a1a1a]">{row.val}</span>
                </div>
                <div className="h-1.5 w-full bg-[#f0ebe3] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, (row.val / row.total) * 100)}%`, background: row.color }} />
                </div>
              </button>
            ))}
            <p className="text-[10px] text-[#c4b8aa] mt-1 pt-1 border-t border-[#f0ebe3]">
              {attendance.length - present.length} missing check-outs · {attendance.filter(a => a.edited).length} manual corrections
            </p>
          </div>
        </Panel>

        {/* Time Off Overview */}
        <Panel
          title="Time Off Overview"
          subtitle="Source: Time Off Requests + Allocations"
          tip="Approved days, pending count, and remaining balance per leave type"
          action={() => navigate('requests')}
          actionLabel="Review"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#f0ebe3]">
                  <th className="text-left font-bold text-[#9c8f85] py-1 pr-2">Type</th>
                  <th className="text-right font-bold text-[#9c8f85] py-1 pr-2">Approved Days</th>
                  <th className="text-right font-bold text-[#9c8f85] py-1 pr-2">Pending</th>
                  <th className="text-right font-bold text-[#9c8f85] py-1">Remaining Balance</th>
                </tr>
              </thead>
              <tbody>
                {leaveRows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-[#c4b8aa] py-4">No leave data</td></tr>
                ) : leaveRows.map((row) => (
                  <tr key={row.name} className="border-b border-[#faf7f3] hover:bg-[#faf7f3] transition-colors">
                    <td className="py-1.5 pr-2 font-semibold text-[#1a1a1a] max-w-[70px] truncate">{row.name}</td>
                    <td className="py-1.5 pr-2 text-right text-[#5a5047] font-medium">{row.approved}</td>
                    <td className="py-1.5 pr-2 text-right">
                      {row.pending > 0
                        ? <span className="px-1.5 py-0.5 rounded-full bg-[#fdf3d7] text-[#c99a2e] font-bold border border-[#e9b84a]">{row.pending}</span>
                        : <span className="text-[#c4b8aa]">—</span>}
                    </td>
                    <td className="py-1.5 text-right font-bold text-[#1a1a1a]">
                      {row.balance !== null ? `${row.balance} ${row.unit.toLowerCase()}` : <span className="text-[#c4b8aa] font-normal">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Department Overview */}
        <Panel
          title="Department Overview"
          subtitle="Source: Employee + Contract + Payslip Totals"
          tip="Headcount and monthly salary by department"
          action={() => navigate('employees')}
          actionLabel="Employees"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#f0ebe3]">
                  <th className="text-left font-bold text-[#9c8f85] py-1 pr-2">Department</th>
                  <th className="text-right font-bold text-[#9c8f85] py-1 pr-2">Headcount</th>
                  <th className="text-right font-bold text-[#9c8f85] py-1">Monthly Salary</th>
                </tr>
              </thead>
              <tbody>
                {deptRows.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-[#c4b8aa] py-4">No department data</td></tr>
                ) : deptRows.map((row) => (
                  <tr key={row.name}
                    className="border-b border-[#faf7f3] hover:bg-[#faf7f3] transition-colors cursor-pointer"
                    onClick={() => navigate('payslips', 'dept:' + row.name)}
                    title={`View ${row.name} payslips`}>
                    <td className="py-1.5 pr-2 font-semibold text-[#1a1a1a]">{row.name}</td>
                    <td className="py-1.5 pr-2 text-right text-[#5a5047] font-medium">{row.count}</td>
                    <td className="py-1.5 text-right font-bold text-[#1a1a1a]">
                      {row.amount > 0 ? money(row.amount) : <span className="text-[#c4b8aa] font-normal">₹—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Models to Aggregate info panel */}
        <Panel
          title="Models to Aggregate"
          subtitle="This is the actual challenge behind the dashboard"
          tip="Data sources powering this dashboard"
        >
          <div className="space-y-2.5 text-[10px] text-[#5a5047]">
            {[
              {
                icon: Users, color: '#60a5fa',
                label: 'Employees / Departments',
                desc: 'Headcount, ownership, grouping',
              },
              {
                icon: FileText, color: '#c99a2e',
                label: 'Payruns / Payslips',
                desc: 'Salary totals, ind. vs pending, trend data',
              },
              {
                icon: Clock3, color: '#22c55e',
                label: 'Attendance',
                desc: 'Presence, late entries, overtime',
              },
              {
                icon: CalendarDays, color: '#f87171',
                label: 'Time Off Requests / Allocations',
                desc: 'Leave taken and leave balances',
              },
            ].map((m) => (
              <div key={m.label} className="flex items-start gap-2 p-2 rounded-xl border border-[#f0ebe3] bg-[#faf7f3]">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: m.color + '20' }}>
                  <m.icon size={12} style={{ color: m.color }} />
                </div>
                <div>
                  <p className="font-bold text-[#1a1a1a] leading-tight">{m.label}</p>
                  <p className="text-[#9c8f85] leading-tight mt-0.5">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ═══════ Employee Detail Drawer (slide-in) ═══════ */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto border-l border-[#e5ded4] z-10 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 px-5 border-b border-[#f0ebe3] flex items-center justify-between bg-[#faf7f3]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9c8f85]">Employee Profile</span>
              <button onClick={() => setSelectedId(null)} className="size-7 rounded-full bg-white border border-[#e5ded4] flex items-center justify-center hover:bg-[#ede7de] transition-colors cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="flex flex-col items-center p-6 border-b border-[#f0ebe3] gap-2 bg-white">
              <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] text-white flex items-center justify-center text-lg font-extrabold">
                {initials(selectedEmp.name)}
              </div>
              <p className="font-bold text-[#1a1a1a]">{selectedEmp.name}</p>
              <p className="text-xs text-[#9c8f85]">{selectedEmp.department}</p>
              <div className="flex gap-1.5 flex-wrap justify-center">
                <StatusBadge value={selectedEmp.status} size="sm" />
                <StatusBadge value={selectedEmp.type} size="sm" showDot={false} />
              </div>
              <div className="flex gap-2 w-full mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs rounded-xl bg-[#1a1a1a] text-white hover:bg-[#333] cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('users', selectedEmp.id);
                  }}
                >
                  View Profile
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-xl border-[#e5ded4] hover:bg-[#f5f0e8] cursor-pointer"
                  onClick={() => { setSelectedId(null); navigate('attendance'); }}>
                  Attendance
                </Button>
              </div>
            </div>
            <div className="p-5 space-y-3 flex-1">
              {[
                { label: 'Manager', value: selectedEmp.manager || '—' },
                { label: 'Location', value: selectedEmp.location || 'HQ' },
                { label: 'Bank', value: selectedEmp.bank ? '✓ Registered' : '⚠ Missing' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs border-b border-[#f0ebe3] pb-2">
                  <span className="text-[#9c8f85]">{label}</span>
                  <span className="font-semibold text-[#1a1a1a]"
                    style={label === 'Bank' && !selectedEmp.bank ? { color: '#f87171' } : undefined}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
