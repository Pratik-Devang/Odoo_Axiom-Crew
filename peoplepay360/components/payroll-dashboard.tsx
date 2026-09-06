'use client';

import { useState, type ElementType, type ReactNode } from 'react';
import {
  Activity, AlertTriangle, Building2, CheckCircle2, ChevronDown, Clock3, Download,
  FileDown, FileSpreadsheet, FileText, Layers3, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { allocationBalance, monthEnd, type Row, type Workspace } from '@/lib/domain';
import { buildDashboardSnapshot } from '@/lib/dashboard-calculations';
import { exportDashboardCsv, exportDashboardPdf } from '@/lib/export';
import { NetSalaryTrendChart } from '@/components/dashboard/NetSalaryTrendChart';

function compactMoney(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}k`;
  return `₹${Math.round(value)}`;
}

function Panel({ title, source, icon: Icon, children }: {
  title: string;
  source: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-2xs">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Icon size={15} className="shrink-0 text-[#c48a12]" />
          {title}
        </h2>
        <p className="mt-0.5 text-[10px] font-medium text-slate-400">Source: {source}</p>
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, note, tone = 'neutral', icon: Icon, onClick }: {
  label: string;
  value: string;
  note: string;
  tone?: 'neutral' | 'positive' | 'warning';
  icon: ElementType;
  onClick: () => void;
}) {
  const noteTone = tone === 'positive' ? 'text-emerald-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-500';
  return (
    <button type="button" onClick={onClick} className="group min-h-28 rounded-2xl border border-[#e5ded4] bg-white p-4 text-left shadow-2xs transition hover:-translate-y-0.5 hover:border-[#cdbfae] hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a6f65]">{label}</span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#faf7f3] text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-700"><Icon size={14} /></span>
      </div>
      <strong className="mt-3 block text-[22px] font-black leading-none tracking-tight text-slate-950">{value}</strong>
      <span className={`mt-2 block text-[10px] font-semibold ${noteTone}`}>{note}</span>
    </button>
  );
}

export default function Dashboard({ s, period, setPeriod, department, setDepartment, employeeType, setEmployeeType, navigate }: {
  s: Workspace;
  period: string;
  setPeriod: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  employeeType: string;
  setEmployeeType: (value: string) => void;
  navigate: (view: string, id?: string) => void;
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const snapshot = buildDashboardSnapshot(s, { period, department, employeeType });
  const { kpis, workforceHealth, departmentShare, trend, timelineMonths, timelineIndex } = snapshot;
  const selectedIds = snapshot.filteredEmployeeIds;
  const periodStart = `${period}-01`;
  const periodEnd = monthEnd(period);
  const selectedRuns = s.payruns.filter((run) => run.period === period);

  const statusRows = ['Paid', 'Validated', 'Computed', 'Draft'].map((status) => ({
    status,
    count: selectedRuns.filter((run) => run.status === status).flatMap((run) => run.slips).filter((slip: Row) => selectedIds.has(slip.employeeId)).length,
  }));
  const totalStatus = Math.max(1, statusRows.reduce((sum, item) => sum + item.count, 0));
  const statusColors: Record<string, string> = { Paid: 'bg-emerald-500', Validated: 'bg-sky-500', Computed: 'bg-amber-500', Draft: 'bg-slate-400' };

  const missingBank = snapshot.activeEmployees.filter((employee) => !employee.bank).length;
  const expiringContracts = s.contracts.filter((contract) => selectedIds.has(contract.employeeId) && contract.end && contract.end >= periodStart && contract.end <= periodEnd).length;
  const draftRuns = selectedRuns.filter((run) => run.status === 'Draft').length;
  const incompleteShifts = s.attendance.filter((row) => selectedIds.has(row.employeeId) && row.checkIn && !row.checkOut).length;
  const alerts = [
    missingBank ? { text: `${missingBank} employees missing bank details`, danger: true } : null,
    incompleteShifts ? { text: `${incompleteShifts} attendance records missing check-out`, danger: true } : null,
    draftRuns ? { text: `${draftRuns} payroll run${draftRuns === 1 ? '' : 's'} still in draft`, danger: false } : null,
    expiringContracts ? { text: `${expiringContracts} contracts expiring this month`, danger: false } : null,
  ].filter(Boolean) as { text: string; danger: boolean }[];

  const timeOffRows = s.leaveTypes.filter((type) => type.active !== false).map((type) => {
    const requests = s.requests.filter((request) => selectedIds.has(request.employeeId) && request.typeId === type.id && request.start <= periodEnd && request.end >= periodStart);
    const approved = requests.filter((request) => request.status === 'Approved').reduce((sum, request) => sum + Number(request.duration || 0), 0);
    const pending = requests.filter((request) => request.status === 'Pending').length;
    const allocations = s.allocations.filter((allocation) => selectedIds.has(allocation.employeeId) && allocation.typeId === type.id && allocation.status === 'Approved' && allocation.start <= periodEnd && allocation.end >= periodStart);
    const remaining = allocations.reduce((sum, allocation) => sum + Math.max(0, allocationBalance(s, allocation)), 0);
    return { id: type.id, name: type.name, approved, pending, remaining: type.requiresAllocation ? remaining : null };
  }).filter((row) => row.approved || row.pending || row.remaining).slice(0, 4);

  const topDepartments = departmentShare.slice(0, 5);
  const maxDepartmentCost = Math.max(1, ...topDepartments.map((row) => row.amount));
  const attendanceBars = [
    { label: 'Present', value: workforceHealth.presentCount, color: 'bg-emerald-500' },
    { label: 'Late', value: workforceHealth.lateCount, color: 'bg-amber-500' },
    { label: 'Absent', value: workforceHealth.absentCount, color: 'bg-rose-500' },
    { label: 'Overtime', value: workforceHealth.overtimeCount, color: 'bg-sky-500' },
  ];
  const maxAttendance = Math.max(1, ...attendanceBars.map((row) => row.value));

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const bytes = await exportDashboardPdf(s, period, department, employeeType);
      triggerDownload(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), `peoplepay360-${period}.pdf`);
    } finally {
      setExporting(false);
      setExportMenuOpen(false);
    }
  };
  const handleExportCsv = () => {
    triggerDownload(exportDashboardCsv(s, period, department, employeeType, 'detail'), `peoplepay360-detail-${period}.csv`);
    setExportMenuOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-none flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-950">Payroll Dashboard</h1>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">Understand payments, staffing impact, leave patterns, and attendance quality for the selected period.</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setExportMenuOpen((open) => !open)} disabled={exporting} className="pill-btn"><Download size={14} /> {exporting ? 'Exporting…' : 'Export'} <ChevronDown size={12} /></button>
          {exportMenuOpen && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-[#e5ded4] bg-white p-1.5 text-xs shadow-xl">
              <button type="button" onClick={() => void handleExportPdf()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-50"><FileDown size={14} /> Summary PDF</button>
              <button type="button" onClick={handleExportCsv} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold hover:bg-slate-50"><FileSpreadsheet size={14} /> Detailed CSV</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-[#e5ded4] bg-[#faf8f5] p-3 md:grid-cols-4">
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Period</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-9 w-full rounded-lg border border-[#ded6ca] bg-white px-3 text-xs font-semibold normal-case text-slate-800 outline-none focus:border-amber-400" /></label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Department</span><select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full rounded-lg border border-[#ded6ca] bg-white px-3 text-xs font-semibold normal-case text-slate-800 outline-none focus:border-amber-400">{['All', ...snapshot.departments].map((value) => <option key={value} value={value}>{value === 'All' ? 'All Departments' : value}</option>)}</select></label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Employee Type</span><select value={employeeType} onChange={(event) => setEmployeeType(event.target.value)} className="h-9 w-full rounded-lg border border-[#ded6ca] bg-white px-3 text-xs font-semibold normal-case text-slate-800 outline-none focus:border-amber-400">{['All', 'Full-time', 'Contract', 'Intern'].map((value) => <option key={value} value={value}>{value === 'All' ? 'All Types' : value}</option>)}</select></label>
        <label className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Company</span><input value="OXP Pvt Ltd" readOnly className="h-9 w-full rounded-lg border border-[#ded6ca] bg-white px-3 text-xs font-semibold normal-case text-slate-500 outline-none" /></label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Total Net Salary Paid" value={compactMoney(kpis.totalNet)} note={kpis.deltaLabel} tone={kpis.deltaLabel.startsWith('+') ? 'positive' : 'neutral'} icon={Wallet} onClick={() => navigate('payslips')} />
        <KpiCard label="Payslips Generated" value={String(kpis.slipCount)} note={kpis.hasActualPayroll ? `${kpis.paidSlips} paid · ${Math.max(0, kpis.slipCount - kpis.paidSlips)} pending` : 'No completed payrun'} tone="positive" icon={FileText} onClick={() => navigate('payruns')} />
        <KpiCard label="Avg Salary / Employee" value={compactMoney(kpis.avgNet)} note={`${kpis.activeEmployeeCount} active employees`} icon={Users} onClick={() => navigate('employees')} />
        <KpiCard label="Approved Time Off Days" value={`${workforceHealth.approvedTimeOffDays} Days`} note="Across selected period" tone="positive" icon={CheckCircle2} onClick={() => navigate('requests')} />
        <KpiCard label="Attendance Health" value={workforceHealth.healthRate === null ? '—' : `${workforceHealth.healthRate}%`} note="Present / reviewed records" tone={workforceHealth.healthRate !== null && workforceHealth.healthRate >= 90 ? 'positive' : 'warning'} icon={Activity} onClick={() => navigate('attendance')} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.95fr_1.15fr]">
        <Panel title="Salary Cost by Department" source="Payslips + Employee Department" icon={Building2}>
          <div className="flex h-44 items-end gap-3 border-b border-l border-slate-200 px-3 pt-3">
            {topDepartments.map((row) => <button key={row.name} type="button" onClick={() => setDepartment(row.name)} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-bold text-amber-700">{compactMoney(row.amount)}</span><span className="w-full max-w-12 rounded-t-lg bg-slate-800 transition-colors group-hover:bg-amber-500" style={{ height: `${Math.max(14, row.amount / maxDepartmentCost * 118)}px` }} /><span className="max-w-full truncate pb-2 text-[9px] font-semibold text-slate-500">{row.name}</span></button>)}
          </div>
        </Panel>

        <Panel title="Monthly Net Salary Trend" source="Historical Payslips / Payruns" icon={TrendingUp}>
          <NetSalaryTrendChart points={trend} period={period} timelineMonths={timelineMonths} timelineIndex={timelineIndex} onPeriodChange={setPeriod} showTimeline={false} />
        </Panel>

        <Panel title="Payslip Status & Payroll Alerts" source="Payrun + Payslip Validation" icon={AlertTriangle}>
          <div className="grid gap-5 sm:grid-cols-[1.2fr_1fr]">
            <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Status split</p><div className="flex h-5 overflow-hidden rounded-md bg-slate-100">{statusRows.filter((row) => row.count > 0).map((row) => <span key={row.status} className={statusColors[row.status]} style={{ width: `${row.count / totalStatus * 100}%` }} title={`${row.status}: ${row.count}`} />)}</div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{statusRows.map((row) => <div key={row.status} className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-600"><span className="flex items-center gap-1.5"><i className={`size-2 rounded-sm ${statusColors[row.status]}`} />{row.status}</span><strong className="text-slate-900">{row.count}</strong></div>)}</div></div>
            <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Current alerts</p><ul className="space-y-2 text-[10px] font-semibold leading-relaxed">{alerts.length ? alerts.map((alert) => <li key={alert.text} className={alert.danger ? 'text-rose-600' : 'text-slate-600'}>• {alert.text}</li>) : <li className="text-emerald-700">• No payroll alerts for this period</li>}</ul></div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[0.9fr_1.05fr_0.95fr_0.95fr]">
        <Panel title="Attendance Overview" source="Attendance" icon={Clock3}>
          <div className="flex h-36 items-end gap-4 border-b border-l border-slate-200 px-3 pt-2">{attendanceBars.map((row) => <button key={row.label} type="button" onClick={() => navigate('attendance', `stat:${row.label.toLowerCase()}`)} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-black text-slate-700">{row.value}</span><span className={`w-full max-w-10 rounded-t-md ${row.color}`} style={{ height: `${Math.max(row.value ? 8 : 2, row.value / maxAttendance * 88)}px` }} /><span className="pb-2 text-[9px] font-semibold text-slate-500">{row.label}</span></button>)}</div>
          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Missing check-outs: <strong className="text-slate-800">{incompleteShifts}</strong> · Attendance coverage: <strong className="text-slate-800">{workforceHealth.healthRate ?? 0}%</strong></p>
        </Panel>

        <Panel title="Time Off Overview" source="Time Off Requests + Allocations" icon={FileText}>
          <div className="overflow-x-auto"><table className="w-full text-left text-[10px]"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="pb-2 font-bold">Type</th><th className="pb-2 font-bold">Approved</th><th className="pb-2 font-bold">Pending</th><th className="pb-2 font-bold">Balance</th></tr></thead><tbody>{timeOffRows.map((row) => <tr key={row.id} className="border-b border-slate-100 last:border-0"><td className="py-2 font-bold text-slate-800">{row.name}</td><td className="py-2 text-slate-600">{row.approved}</td><td className="py-2 text-slate-600">{row.pending}</td><td className="py-2 text-slate-600">{row.remaining === null ? 'N/A' : row.remaining}</td></tr>)}</tbody></table></div>
        </Panel>

        <Panel title="Department Overview" source="Employees + Contracts + Payslip Totals" icon={Building2}>
          <div className="overflow-x-auto"><table className="w-full text-left text-[10px]"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="pb-2 font-bold">Department</th><th className="pb-2 font-bold">Headcount</th><th className="pb-2 text-right font-bold">Monthly Salary</th></tr></thead><tbody>{topDepartments.map((row) => <tr key={row.name} className="border-b border-slate-100 last:border-0"><td className="py-2 font-bold text-slate-800">{row.name}</td><td className="py-2 text-slate-600">{row.count}</td><td className="py-2 text-right font-bold text-slate-800">{compactMoney(row.amount)}</td></tr>)}</tbody></table></div>
        </Panel>

        <Panel title="Models to Aggregate" source="Connected operational records" icon={Layers3}>
          <p className="mb-3 text-[10px] leading-relaxed text-slate-500">The relationships powering this dashboard:</p>
          <ul className="space-y-2 text-[10px] font-semibold leading-relaxed text-slate-700"><li>• Employees → department, ownership, grouping</li><li>• Contracts → wage, schedule, active employees</li><li>• Payruns / Payslips → totals, paid vs pending</li><li>• Attendance → presence, lateness, overtime</li><li>• Time Off → allocations, requests, balances</li></ul>
        </Panel>
      </div>
    </div>
  );
}
