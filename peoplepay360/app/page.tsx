'use client';

import React, { useState } from 'react';
import {
  Users,
  ArrowUpRight,
  Wallet,
  FileText,
  Activity,
  TrendingUp,
  Clock3,
  Building2,
  Download,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
} from 'lucide-react';
import {
  type Workspace,
  money,
} from '@/lib/domain';
import { niceMonth } from './peoplepay-ui';
import { exportDashboardCsv, exportDashboardPdf } from '@/lib/export';
import { NetSalaryTrendChart } from '@/components/dashboard/NetSalaryTrendChart';
import { buildDashboardSnapshot } from '@/lib/dashboard-calculations';

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

  /* ── Unified Filtered Dashboard Snapshot ── */
  const snapshot = buildDashboardSnapshot(s, { period, department, employeeType });
  const { kpis, workforceHealth, departmentShare, totalDepartmentAmount, trend, timelineMonths, timelineIndex } = snapshot;

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
              {['All', ...snapshot.departments].map((d) => (
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
          value={money(kpis.totalNet)}
          delta={kpis.hasActualPayroll ? kpis.deltaLabel : 'Not yet run for this period'}
          sub={`${kpis.activeEmployeeCount} active employees${kpis.hasActualPayroll ? '' : ' (Est.)'}`}
          icon={Wallet}
          accent
          onClick={() => navigate('payslips')}
        />
        <KpiCard
          label="Payslips Generated"
          value={String(kpis.hasActualPayroll ? kpis.slipCount : 0)}
          delta={
            kpis.hasActualPayroll
              ? kpis.paidSlips > 0
                ? `${kpis.paidSlips} Paid`
                : 'Ready for Run'
              : 'Not yet run'
          }
          sub={`For ${niceMonth(period)}`}
          icon={FileText}
          onClick={() => navigate('payruns')}
        />
        <KpiCard
          label="Avg Salary / Employee"
          value={money(kpis.avgNet)}
          sub={kpis.hasActualPayroll ? 'Monthly net take-home' : 'Estimated net take-home'}
          icon={Users}
          onClick={() => navigate('employees')}
        />
        <KpiCard
          label="Attendance Health"
          value={workforceHealth.healthRate !== null ? `${workforceHealth.healthRate}%` : '—'}
          delta={
            workforceHealth.healthRate !== null
              ? workforceHealth.lateCount > 0
                ? `${workforceHealth.lateCount} late arrivals`
                : 'On track'
              : 'No records'
          }
          sub={`${workforceHealth.approvedTimeOffDays} approved leave days`}
          icon={Activity}
          onClick={() => navigate('attendance')}
        />
      </div>

      {/* ═══════ MAIN FEATURE: MONTHLY SALARY TREND GRAPH ═══════ */}
      <div className="bg-white border border-[#e5ded4] rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-600" />
              Net Salary Trend
            </h2>
            <p className="text-xs text-slate-500">
              6-month window · use slider to change period
            </p>
          </div>
          <button
            onClick={() => navigate('payruns')}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            Manage Payruns <ArrowUpRight size={13} />
          </button>
        </div>

        <NetSalaryTrendChart
          points={trend}
          period={period}
          timelineMonths={timelineMonths}
          timelineIndex={timelineIndex}
          onPeriodChange={setPeriod}
        />
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
                {departmentShare.length} Departments
              </span>
            </div>
            <div className="space-y-3.5 pt-4">
              {departmentShare.map((d) => {
                const pct = Math.round((d.amount / totalDepartmentAmount) * 100);
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
                <span className="text-lg font-black text-emerald-700">{workforceHealth.presentCount} Records</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{workforceHealth.completeCount} completed shifts</span>
              </div>

              <div className="p-3 rounded-xl bg-[#faf7f3] border border-[#e5ded4]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Time Off</span>
                <span className="text-lg font-black text-amber-700">{workforceHealth.approvedTimeOffDays} Days</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{workforceHealth.pendingRequests} pending requests</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> On-Time Presence
                </span>
                <span className="font-extrabold text-slate-900">
                  {Math.max(0, workforceHealth.presentCount - workforceHealth.lateCount)} shifts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Late Check-Ins
                </span>
                <span className="font-extrabold text-amber-700">{workforceHealth.lateCount} shifts</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Unrecorded / Absent
                </span>
                <span className="font-extrabold text-rose-600">{workforceHealth.absentCount} records</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Overtime Records:</span>
            <span className="font-bold text-slate-800">{workforceHealth.overtimeCount} shifts &gt; 9 hrs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
