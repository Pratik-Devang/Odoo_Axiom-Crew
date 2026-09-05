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
  UserCircle2,
  BadgeCheck,
  X,
} from 'lucide-react';
import {
  type Workspace,
  type Row,
  money,
  hours,
  allocationBalance,
  monthEnd,
} from '@/lib/domain';
import { Picker, DataTable, Badge, niceMonth } from './peoplepay-ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

function StatBar({
  label,
  value,
  max,
  displayValue,
  variant = 'gold',
}: {
  label: string;
  value: number;
  max: number;
  displayValue: string;
  variant?: 'gold' | 'dark' | 'green';
}) {
  const pct = max > 0 ? Math.round(Math.min((value / max) * 100, 100)) : 0;
  const fillClass =
    variant === 'dark' ? 'stat-fill fill-dark' : variant === 'green' ? 'stat-fill fill-green' : 'stat-fill';
  return (
    <div className="stat-row">
      <div className="stat-row-header">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{displayValue}</span>
      </div>
      <div className="stat-track">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

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
  const employees = s.employees.filter(
    (e) =>
      (department === 'All' || e.department === department) &&
      (employeeType === 'All' || e.type === employeeType)
  );
  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const ids = new Set(employees.map((e) => e.id));
  const departments = [...new Set(s.employees.map((e) => e.department))];

  // Overlay drawer state: null by default so overview is uncrowded
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');
  const [secondaryTab, setSecondaryTab] = useState<'dept' | 'attendance' | 'leave' | 'payruns'>('dept');

  const selectedEmp = selectedId ? s.employees.find((e) => e.id === selectedId) : null;

  const selectedRuns = s.payruns.filter((r) => r.period === period);
  const slips = selectedRuns
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, status: r.status })))
    .filter((p) => ids.has(p.employeeId));

  const paid = slips.filter((p) => p.status === 'Paid').reduce((n, p) => n + p.net, 0);
  const net = slips.reduce((n, p) => n + p.net, 0);

  const attendance = s.attendance.filter(
    (a) => ids.has(a.employeeId) && a.date.startsWith(period)
  );
  const present = attendance.filter((a) => a.checkIn);
  const complete = present.filter((a) => a.checkOut);
  const missing = present.length - complete.length;
  const late = present.filter((a) => {
    const e = s.employees.find((e) => e.id === a.employeeId);
    const sc = s.schedules.find((sc) => sc.id === e?.scheduleId);
    return a.checkIn > (sc?.start || '09:00');
  }).length;
  const health = attendance.length
    ? Math.round((complete.length / attendance.length) * 100)
    : 0;

  const requests = s.requests.filter(
    (r) =>
      ids.has(r.employeeId) &&
      r.start <= monthEnd(period) &&
      r.end >= period + '-01'
  );
  const pending = requests.filter((r) => r.status === 'Pending').length;

  const trend = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(period + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() - 5 + i);
    const p = date.toISOString().slice(0, 7);
    return {
      period: p,
      amount: s.payruns
        .filter((r) => r.period === p && r.status === 'Paid')
        .flatMap((r) => r.slips)
        .filter((p: Row) => ids.has(p.employeeId))
        .reduce((n: number, p: Row) => n + p.net, 0),
    };
  });
  const trendMax = Math.max(...trend.map((t) => t.amount), 1);

  const deptRows = departments
    .filter((d) => department === 'All' || department === d)
    .map((d) => ({
      id: d,
      name: d,
      count: employees.filter((e) => e.department === d && e.status === 'Active').length,
      amount: slips
        .filter((p) => employees.find((e) => e.id === p.employeeId)?.department === d)
        .reduce((n, p) => n + p.gross, 0),
    }));
  const maxDept = Math.max(...deptRows.map((r) => r.amount), 1);

  const bankMissing = employees.filter((e) => e.status === 'Active' && !e.bank);
  const drafts = selectedRuns.filter(
    (r) => r.status !== 'Paid' && r.employeeIds.some((id: string) => ids.has(id))
  );
  const expiring = s.contracts.filter(
    (c) => ids.has(c.employeeId) && c.end && c.end.startsWith(period)
  );

  const alerts = [
    ...(drafts.length
      ? [
          {
            id: 'pay',
            title: `${drafts.length} payrun${drafts.length > 1 ? 's' : ''} awaiting completion`,
            detail: `${niceMonth(period)} · Review and process payroll`,
            view: 'payruns',
            employeeId: undefined as string | undefined,
            priority: 'ACTION',
          },
        ]
      : []),
    ...(pending
      ? [
          {
            id: 'leave',
            title: `${pending} time-off request${pending > 1 ? 's' : ''} to review`,
            detail: 'Review leave approvals to keep operations smooth',
            view: 'requests',
            employeeId: undefined as string | undefined,
            priority: 'REVIEW',
          },
        ]
      : []),
    ...(bankMissing.length
      ? [
          {
            id: 'bank',
            title: `${bankMissing.length} missing bank account${bankMissing.length > 1 ? 's' : ''}`,
            detail: bankMissing.map((e) => e.name).join(', '),
            view: 'employees',
            employeeId: bankMissing[0].id,
            priority: 'ACTION',
          },
        ]
      : []),
    ...(expiring.length
      ? [
          {
            id: 'contract',
            title: `${expiring.length} contract${expiring.length > 1 ? 's' : ''} expiring this month`,
            detail: 'Review upcoming employment term changes',
            view: 'contracts',
            employeeId: undefined as string | undefined,
            priority: 'NOTICE',
          },
        ]
      : []),
  ];

  const months = [
    ...new Set([...s.payruns.map((r) => r.period), period, '2026-10', '2026-11', '2026-12']),
  ]
    .sort()
    .reverse();

  function empSlip(eId: string) {
    return slips.find((p) => p.employeeId === eId);
  }

  const selSchedule = selectedEmp
    ? s.schedules.find((sc) => sc.id === selectedEmp.scheduleId)
    : null;
  const selSlip = selectedEmp ? empSlip(selectedEmp.id) : null;
  const selAttendance = selectedEmp
    ? s.attendance.filter(
        (a) => a.employeeId === selectedEmp.id && a.date.startsWith(period)
      )
    : [];
  const selPresent = selAttendance.filter((a) => a.checkIn).length;
  const selHealth = selAttendance.length
    ? Math.round((selPresent / selAttendance.length) * 100)
    : 0;

  // Fixed NaN bug: use a.amount instead of undefined a.granted
  const selAllocations = selectedEmp
    ? s.allocations.filter(
        (a) =>
          a.employeeId === selectedEmp.id &&
          a.start <= period + '-01' &&
          a.end >= monthEnd(period)
      )
    : [];
  const selLeaveUsed = selAllocations.reduce(
    (n, a) => n + ((Number(a.amount) || 0) - allocationBalance(s, a)),
    0
  );
  const selLeaveTotal = selAllocations.reduce((n, a) => n + (Number(a.amount) || 0), 0);

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.department.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="dash-layout-clean">
      {/* ═════════════════════════════════════════════════════════
          LEFT — Compact Team Directory Rail
      ═════════════════════════════════════════════════════════ */}
      <aside className="dash-left-compact">
        <div className="dash-left-header">
          <div className="flex items-center justify-between">
            <p className="dash-left-title">Team · {employees.length}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Picker
              label="Dept"
              value={department}
              onChange={setDepartment}
              options={['All', ...departments]}
            />
            <Picker
              label="Type"
              value={employeeType}
              onChange={setEmployeeType}
              options={['All', 'Full-time', 'Part-time', 'Intern', 'Contract']}
            />
          </div>
          <div className="pill-search">
            <Search className="size-3.5 shrink-0" style={{ color: '#9c8f85' }} />
            <input
              type="text"
              placeholder="Search team…"
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="dash-left-list">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <UserCircle2 className="size-7 text-[#c4b8aa]" />
              <p className="text-xs text-[#9c8f85]">No matching employees</p>
            </div>
          ) : (
            filteredEmployees.map((e) => {
              const slip = empSlip(e.id);
              const empNet = slip?.net ?? 0;
              const isSelected = selectedId === e.id;
              return (
                <button
                  key={e.id}
                  className={`emp-row${isSelected ? ' active' : ''}`}
                  onClick={() => setSelectedId(isSelected ? null : e.id)}
                  title="Click to view employee details"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                    <div className="emp-row-avatar">{initials(e.name)}</div>
                    <div className="emp-row-info">
                      <p className="emp-row-name">{e.name}</p>
                      <p className="emp-row-dept">
                        {e.department} · {e.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.status !== 'Active' && (
                      <StatusBadge value={e.status} size="sm" showDot={false} />
                    )}
                    <span className="emp-row-pay">{slip ? money(empNet) : '—'}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ═════════════════════════════════════════════════════════
          CENTER — Primary Visual Focus (KPIs + Key Chart + Tabs)
      ═════════════════════════════════════════════════════════ */}
      <main className="dash-center-focused">
        {/* ─── Level 1: Primary KPI Row ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="kpi-card accent-black">
            <span className="kpi-card-label">Total Net Paid</span>
            <span className="kpi-card-value">{money(paid)}</span>
            <p className="kpi-card-sub">
              {slips.filter((p) => p.status === 'Paid').length} payslips paid
            </p>
            <div className="kpi-card-icon">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-card-label">Generated Slips</span>
            <span className="kpi-card-value">{slips.length}</span>
            <p className="kpi-card-sub">
              {slips.filter((p) => p.status !== 'Paid').length} pending payment
            </p>
            <div className="kpi-card-icon">
              <FileText className="size-4" />
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-card-label">Average Net Pay</span>
            <span className="kpi-card-value">{money(slips.length ? net / slips.length : 0)}</span>
            <p className="kpi-card-sub">Per generated payslip</p>
            <div className="kpi-card-icon">
              <Users className="size-4" />
            </div>
          </div>
          <div className="kpi-card">
            <span className="kpi-card-label">Attendance Health</span>
            <span className="kpi-card-value">{health}%</span>
            <p className="kpi-card-sub">
              {complete.length}/{attendance.length} shifts complete
            </p>
            <div className="kpi-card-icon">
              <Activity className="size-4" />
            </div>
          </div>
        </section>

        {/* ─── Level 2: Key Focal Point (Chart + Quiet Needs Attention) ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Primary Key Chart */}
          <Card className="lg:col-span-8 bg-white border-[#e5ded4] rounded-2xl shadow-xs">
            <CardHeader className="p-6 pb-2 border-b border-[#f0ebe3]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-[#1a1a1a] flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#1a1a1a]" />
                    Monthly Net Salary Trend
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 text-[#9c8f85]">
                    Six months trend · {department === 'All' ? 'All departments' : department}
                  </CardDescription>
                </div>
                <StatusBadge value="Paid" size="sm" />
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <div
                className="flex items-end justify-between gap-3 h-44 pt-6 px-2"
                role="img"
                aria-label={trend.map((t) => `${niceMonth(t.period)}: ${money(t.amount)}`).join('; ')}
              >
                {trend.map((t) => {
                  const heightPct = Math.max(6, Math.round((t.amount / trendMax) * 100));
                  const isCurrent = t.period === period;
                  return (
                    <div
                      key={t.period}
                      className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer"
                      onClick={() => setPeriod(t.period)}
                      title={`${niceMonth(t.period)}: ${money(t.amount)}`}
                    >
                      <span className="text-[10px] font-semibold mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#5a5047]">
                        {money(t.amount)}
                      </span>
                      <div className="w-full max-w-[42px] rounded-t-lg relative flex items-end h-32 overflow-hidden bg-[#f0ebe3]">
                        <div
                          className="w-full rounded-t-lg transition-all duration-300"
                          style={{
                            height: `${heightPct}%`,
                            background: isCurrent ? '#e9b84a' : '#ded7cc',
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs mt-2 transition-colors ${
                          isCurrent ? 'text-[#1a1a1a] font-bold' : 'text-[#9c8f85] font-medium'
                        }`}
                      >
                        {niceMonth(t.period).split(' ')[0].slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-[#f0ebe3] flex items-center justify-between text-xs text-[#9c8f85]">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full inline-block bg-[#e9b84a]" />
                  Active period ({niceMonth(period)})
                </span>
                <span>Values in INR (₹)</span>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Quiet Needs Attention */}
          <Card className="lg:col-span-4 bg-[#fcfbfa] border-[#e8e2d8] rounded-2xl shadow-xs flex flex-col">
            <CardHeader className="p-5 pb-3 border-b border-[#f0ebe3]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                  <AlertCircle className="size-4 text-[#9c8f85]" />
                  Needs Attention
                </CardTitle>
                <span className="px-2 py-0.5 rounded-full font-semibold text-xs border border-[#e5ded4] bg-[#f0ebe3] text-[#5a5047]">
                  {alerts.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
              {alerts.length > 0 ? (
                <div className="space-y-2.5">
                  {alerts.map((a) => {
                    const isUrgent = a.priority === 'ACTION';
                    return (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl border border-[#e8e2d8] bg-white hover:border-[#c4b8aa] transition-all flex items-start justify-between gap-2.5"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`rounded-full px-1.5 py-0.2 text-[9.5px] font-bold ${
                                isUrgent
                                  ? 'bg-[#1a1a1a] text-white'
                                  : 'bg-[#fdf3d7] text-[#c99a2e] border border-[#e9b84a]'
                              }`}
                            >
                              {a.priority}
                            </span>
                            <h4 className="text-xs font-semibold text-[#1a1a1a] truncate">
                              {a.title}
                            </h4>
                          </div>
                          <p className="line-clamp-1 text-[11px] text-[#9c8f85]">{a.detail}</p>
                        </div>
                        <button
                          className="shrink-0 h-7 px-2.5 rounded-lg border border-[#e5ded4] bg-white hover:bg-[#f5f0e8] font-medium inline-flex items-center gap-1 text-[11px] text-[#5a5047] transition-colors cursor-pointer"
                          onClick={() => navigate(a.view, a.employeeId)}
                        >
                          Fix <ChevronRight className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty className="py-6">
                  <EmptyMedia variant="icon" className="bg-[#f0ebe3] text-[#9c8f85]">
                    <CheckCircle2 className="size-5 text-[#5a5047]" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm font-semibold text-[#1a1a1a]">
                      All caught up!
                    </EmptyTitle>
                    <EmptyDescription className="text-xs text-[#9c8f85]">
                      No pending items for {niceMonth(period)}.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ─── Level 3: Secondary Tabbed Explorer (Prevents competing focal points) ─── */}
        <section>
          <Card className="bg-white border-[#e5ded4] rounded-2xl shadow-xs overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-[#f0ebe3] flex-wrap gap-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    secondaryTab === 'dept'
                      ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                      : 'text-[#9c8f85] hover:text-[#1a1a1a]'
                  }`}
                  onClick={() => setSecondaryTab('dept')}
                >
                  <Building2 className="size-3.5" />
                  Department Breakdown
                </button>
                <button
                  className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    secondaryTab === 'attendance'
                      ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                      : 'text-[#9c8f85] hover:text-[#1a1a1a]'
                  }`}
                  onClick={() => setSecondaryTab('attendance')}
                >
                  <Clock3 className="size-3.5" />
                  Attendance Shifts
                </button>
                <button
                  className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    secondaryTab === 'leave'
                      ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                      : 'text-[#9c8f85] hover:text-[#1a1a1a]'
                  }`}
                  onClick={() => setSecondaryTab('leave')}
                >
                  <CalendarDays className="size-3.5" />
                  Time Off Balances
                </button>
                <button
                  className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    secondaryTab === 'payruns'
                      ? 'text-[#1a1a1a] border-b-2 border-[#1a1a1a]'
                      : 'text-[#9c8f85] hover:text-[#1a1a1a]'
                  }`}
                  onClick={() => setSecondaryTab('payruns')}
                >
                  <FileText className="size-3.5" />
                  Payruns Log
                </button>
              </div>

              {secondaryTab === 'dept' && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-[#f0ebe3] text-[#5a5047] mb-2">
                  {deptRows.length} departments · {employees.length} staff
                </span>
              )}
              {secondaryTab === 'attendance' && (
                <button
                  className="text-xs font-semibold inline-flex items-center gap-1 text-[#5a5047] hover:text-[#1a1a1a] mb-2 cursor-pointer"
                  onClick={() => navigate('attendance')}
                >
                  Open Attendance <ArrowUpRight className="size-3" />
                </button>
              )}
              {secondaryTab === 'leave' && (
                <button
                  className="text-xs font-semibold inline-flex items-center gap-1 text-[#5a5047] hover:text-[#1a1a1a] mb-2 cursor-pointer"
                  onClick={() => navigate('requests')}
                >
                  Review Requests <ArrowUpRight className="size-3" />
                </button>
              )}
              {secondaryTab === 'payruns' && (
                <button
                  className="text-xs font-semibold inline-flex items-center gap-1 text-[#5a5047] hover:text-[#1a1a1a] mb-2 cursor-pointer"
                  onClick={() => navigate('payruns')}
                >
                  All Payruns <ArrowUpRight className="size-3" />
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-6">
              {/* Tab 1: Department Breakdown */}
              {secondaryTab === 'dept' && (
                <div className="space-y-4">
                  {deptRows.length > 0 && slips.length > 0 ? (
                    deptRows.map((d) => (
                      <div key={d.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                            {d.name}
                            <span className="text-[11px] font-normal text-[#9c8f85]">
                              ({d.count} active staff)
                            </span>
                          </span>
                          <span className="font-semibold text-[#1a1a1a]">{money(d.amount)}</span>
                        </div>
                        <div className="emp-bar-track">
                          <div
                            className="emp-bar-fill"
                            style={{
                              width: `${(d.amount / maxDept) * 100}%`,
                              background: '#5a5047',
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty className="py-6">
                      <EmptyHeader>
                        <EmptyTitle className="text-xs text-[#9c8f85]">
                          No gross salary recorded
                        </EmptyTitle>
                        <EmptyDescription className="text-xs text-[#c4b8aa]">
                          Compute a payrun to see department expenditure.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </div>
              )}

              {/* Tab 2: Attendance Shift Overview */}
              {secondaryTab === 'attendance' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Present', val: present.length, color: '#22c55e' },
                      { label: 'Late check-in', val: late, color: '#e9b84a' },
                      {
                        label: 'Absent',
                        val: Math.max(attendance.length - present.length, 0),
                        color: '#f87171',
                      },
                      {
                        label: 'Over 9 hours',
                        val: attendance.filter((a) => hours(a) > 9).length,
                        color: '#60a5fa',
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="p-3 rounded-xl border border-[#e5ded4] bg-[#faf7f3] text-center"
                        style={{ borderBottom: `3px solid ${stat.color}` }}
                      >
                        <div className="text-xl font-bold text-[#1a1a1a]">{stat.val}</div>
                        <div className="text-[11px] font-medium mt-1 text-[#9c8f85]">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl border border-[#e5ded4] bg-[#faf7f3] flex items-center justify-between text-xs text-[#9c8f85]">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#c4b8aa]" />
                      {missing} missing check-outs
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#c4b8aa]" />
                      {attendance.filter((a) => a.edited).length} manual corrections
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 3: Time Off Balances */}
              {secondaryTab === 'leave' && (
                <DataTable
                  rows={s.leaveTypes}
                  columns={[
                    {
                      title: 'Leave Type',
                      render: (t) => <span className="font-semibold text-[#1a1a1a]">{t.name}</span>,
                    },
                    {
                      title: 'Approved Duration',
                      render: (t) =>
                        requests
                          .filter((r) => r.typeId === t.id && r.status === 'Approved')
                          .reduce(
                            (n, r) =>
                              n +
                              (t.unit === 'Hours'
                                ? r.duration
                                : Math.round(
                                    (Date.parse(r.end < monthEnd(period) ? r.end : monthEnd(period)) -
                                      Date.parse(r.start > period + '-01' ? r.start : period + '-01')) /
                                      86400000
                                  ) + 1),
                            0
                          ) +
                        ' ' +
                        t.unit.toLowerCase(),
                    },
                    {
                      title: 'Pending Requests',
                      render: (t) => {
                        const count = requests.filter((r) => r.typeId === t.id && r.status === 'Pending').length;
                        return count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-[#e9b84a] bg-[#fdf3d7] text-[#c99a2e]">
                            {count} pending
                          </span>
                        ) : (
                          <span className="text-xs text-[#c4b8aa]">0</span>
                        );
                      },
                    },
                    {
                      title: 'Pool Balance',
                      render: (t) =>
                        t.requiresAllocation ? (
                          s.allocations
                            .filter(
                              (a) =>
                                a.typeId === t.id &&
                                ids.has(a.employeeId) &&
                                a.start <= period + '-01' &&
                                a.end >= monthEnd(period)
                            )
                            .reduce((n, a) => n + allocationBalance(s, a), 0) +
                          ' ' +
                          t.unit.toLowerCase()
                        ) : (
                          <span className="text-xs text-[#c4b8aa]">Unlimited</span>
                        ),
                    },
                  ]}
                />
              )}

              {/* Tab 4: Payruns Log */}
              {secondaryTab === 'payruns' && (
                <DataTable
                  rows={s.payruns
                    .filter(
                      (r) => r.period === period && r.employeeIds.some((id: string) => ids.has(id))
                    )
                    .slice()
                    .reverse()}
                  empty="No payruns created for this period. Click 'New payrun' to create one."
                  columns={[
                    {
                      title: 'Payrun Name',
                      render: (r) => (
                        <button
                          className="font-semibold text-[#1a1a1a] hover:text-[#c99a2e] hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
                          onClick={() => navigate('run', r.id)}
                        >
                          {r.name} <ArrowUpRight className="size-3" />
                        </button>
                      ),
                    },
                    {
                      title: 'Structure',
                      render: (r) => (
                        <span className="text-[#7a6f65]">
                          {s.structures.find((st) => st.id === r.structureId)?.name || 'Standard'}
                        </span>
                      ),
                    },
                    {
                      title: 'Staff',
                      render: (r) => (
                        <span className="inline-flex items-center gap-1 font-medium text-[#5a5047]">
                          <Users className="size-3 text-[#c4b8aa]" />
                          {r.employeeIds.filter((id: string) => ids.has(id)).length}
                        </span>
                      ),
                    },
                    {
                      title: 'Net Salary',
                      render: (r) => (
                        <span className="font-semibold text-[#1a1a1a]">
                          {money(
                            r.slips
                              .filter((p: Row) => ids.has(p.employeeId))
                              .reduce((n: number, p: Row) => n + p.net, 0)
                          )}
                        </span>
                      ),
                    },
                    { title: 'Status', render: (r) => <Badge value={r.status} /> },
                  ]}
                />
              )}
            </div>
          </Card>
        </section>
      </main>

      {/* ═════════════════════════════════════════════════════════
          RIGHT — Slide-in Employee Detail Drawer (Overlay)
          Only visible when an employee is actively selected
      ═════════════════════════════════════════════════════════ */}
      {selectedEmp && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedEmp.name}`}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSelectedId(null)}
          />

          {/* Drawer Content Panel */}
          <div className="relative w-full max-w-[360px] bg-white h-full shadow-2xl overflow-y-auto border-l border-[#e5ded4] flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Topbar */}
            <div className="p-4 px-6 border-b border-[#f0ebe3] flex items-center justify-between bg-[#faf7f3]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9c8f85]">
                Employee Profile
              </span>
              <button
                className="size-7 rounded-full bg-white hover:bg-[#ede7de] border border-[#e5ded4] flex items-center justify-center text-[#5a5047] transition-colors cursor-pointer"
                onClick={() => setSelectedId(null)}
                aria-label="Close drawer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Profile Header */}
            <div className="dash-right-header">
              <div className="dash-right-avatar">{initials(selectedEmp.name)}</div>
              <div>
                <p className="dash-right-name">{selectedEmp.name}</p>
                <p className="dash-right-role">{selectedEmp.department}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center mt-1">
                <StatusBadge value={selectedEmp.status} size="sm" />
                <StatusBadge value={selectedEmp.type} size="sm" showDot={false} />
              </div>
              <div className="flex gap-2 w-full mt-3">
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs rounded-xl bg-[#1a1a1a] text-white hover:bg-[#333] cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('employees', selectedEmp.id);
                  }}
                >
                  View Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-xs rounded-xl border-[#e5ded4] text-[#5a5047] hover:bg-[#f5f0e8] cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('attendance');
                  }}
                >
                  Attendance
                </Button>
              </div>
            </div>

            {/* Basic Information */}
            <div className="dash-right-section">
              <p className="dash-section-title">Basic Information</p>
              {[
                { label: 'Manager', value: selectedEmp.manager || '—' },
                { label: 'Location', value: selectedEmp.location || 'Headquarters' },
                { label: 'Schedule', value: selSchedule?.name ?? '—' },
                { label: 'Bank', value: selectedEmp.bank ? '✓ Registered' : '⚠ Missing' },
              ].map(({ label, value }) => (
                <div key={label} className="dash-info-row">
                  <span className="dash-info-label">{label}</span>
                  <span
                    className="dash-info-value"
                    style={label === 'Bank' && !selectedEmp.bank ? { color: '#f87171' } : undefined}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Statistics (with fixed NaN bug) */}
            <div className="dash-right-section">
              <p className="dash-section-title">Statistics · {niceMonth(period)}</p>
              <StatBar
                label="Net Pay"
                value={selSlip?.net ?? 0}
                max={Math.max(selSlip?.gross ?? 1, 1)}
                displayValue={selSlip ? money(selSlip.net) : 'No payslip'}
                variant="dark"
              />
              <StatBar
                label="Attendance rate"
                value={selHealth}
                max={100}
                displayValue={`${selHealth}%`}
                variant={selHealth >= 80 ? 'green' : selHealth >= 50 ? 'dark' : 'dark'}
              />
              <StatBar
                label="Leave used"
                value={selLeaveUsed}
                max={Math.max(selLeaveTotal, 1)}
                displayValue={
                  selLeaveTotal > 0 ? `${selLeaveUsed} / ${selLeaveTotal} days` : 'No leave balance'
                }
                variant="dark"
              />
            </div>

            {/* Quick Actions */}
            <div className="dash-right-section">
              <p className="dash-section-title">Quick Actions</p>
              <div className="flex flex-col gap-2">
                <button
                  className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('contracts');
                  }}
                >
                  <BadgeCheck className="size-3.5 text-[#c99a2e]" />
                  <span className="doc-chip-name">View Contracts</span>
                  <ChevronRight className="size-3 ml-auto text-[#c4b8aa]" />
                </button>
                <button
                  className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('requests');
                  }}
                >
                  <CalendarDays className="size-3.5 text-[#9c8f85]" />
                  <span className="doc-chip-name">Time Off Requests</span>
                  <ChevronRight className="size-3 ml-auto text-[#c4b8aa]" />
                </button>
                <button
                  className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedId(null);
                    navigate('payruns');
                  }}
                >
                  <FileText className="size-3.5 text-[#9c8f85]" />
                  <span className="doc-chip-name">Payslips</span>
                  <ChevronRight className="size-3 ml-auto text-[#c4b8aa]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
