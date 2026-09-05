'use client';

import React from 'react';
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
  Sparkles,
  ChevronRight,
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
  const ids = new Set(employees.map((e) => e.id));
  const departments = [...new Set(s.employees.map((e) => e.department))];

  const selectedRuns = s.payruns.filter((r) => r.period === period);
  const slips = selectedRuns
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, status: r.status })))
    .filter((p) => ids.has(p.employeeId));

  const paid = slips
    .filter((p) => p.status === 'Paid')
    .reduce((n, p) => n + p.net, 0);
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
  const approvedDays = requests
    .filter(
      (r) =>
        r.status === 'Approved' &&
        s.leaveTypes.find((t) => t.id === r.typeId)?.unit === 'Days'
    )
    .reduce(
      (n, r) =>
        n +
        Math.round(
          (Date.parse(r.end < monthEnd(period) ? r.end : monthEnd(period)) -
            Date.parse(r.start > period + '-01' ? r.start : period + '-01')) /
            86400000
        ) +
        1,
      0
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
  const max = Math.max(...trend.map((t) => t.amount), 1);

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
            priority: 'ACTION',
            color: 'border-slate-200 bg-white text-slate-800',
            badgeBg: 'bg-slate-900 text-white',
          },
        ]
      : []),
    ...(pending
      ? [
          {
            id: 'leave',
            title: `${pending} time off request${pending > 1 ? 's' : ''} to review`,
            detail: 'Review leave approvals to keep operations smooth',
            view: 'requests',
            priority: 'REVIEW',
            color: 'border-slate-200 bg-white text-slate-800',
            badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200',
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
            color: 'border-slate-200 bg-white text-slate-800',
            badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200',
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
            priority: 'NOTICE',
            color: 'border-slate-200 bg-white text-slate-800',
            badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200',
          },
        ]
      : []),
  ];

  const months = [
    ...new Set([...s.payruns.map((r) => r.period), period, '2026-10', '2026-11', '2026-12']),
  ]
    .sort()
    .reverse();

  const metrics = [
    {
      name: 'Total Net Paid',
      value: money(paid),
      sub: `${slips.filter((p) => p.status === 'Paid').length} paid this period`,
      Icon: Wallet,
      accent: true,
      highlight: 'text-white',
      iconBg: 'bg-slate-800 text-white',
    },
    {
      name: 'Generated Slips',
      value: slips.length,
      sub: `${slips.filter((p) => p.status !== 'Paid').length} awaiting payment`,
      Icon: FileText,
      accent: false,
      highlight: 'text-slate-900',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    {
      name: 'Average Net Pay',
      value: money(slips.length ? net / slips.length : 0),
      sub: 'Per generated payslip',
      Icon: Users,
      accent: false,
      highlight: 'text-slate-900',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    {
      name: 'Approved Time Off',
      value: `${approvedDays} days`,
      sub: `${pending} requests pending`,
      Icon: CalendarDays,
      accent: false,
      highlight: 'text-slate-900',
      iconBg: 'bg-slate-100 text-slate-700',
    },
    {
      name: 'Attendance Health',
      value: `${health}%`,
      sub: `${complete.length} / ${attendance.length} completed`,
      Icon: Activity,
      accent: false,
      highlight: 'text-slate-900',
      iconBg: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {metrics.map((m) => (
          <Card
            key={m.name}
            className={`transition-all duration-200 hover:shadow-md border rounded-2xl ${
              m.accent
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white border-slate-200/80 shadow-xs'
            }`}
          >
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${m.accent ? 'text-slate-400' : 'text-slate-500'}`}>
                  {m.name}
                </span>
                <div className={`p-2 rounded-xl ${m.iconBg}`}>
                  <m.Icon className="size-4" />
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold tracking-tight ${m.highlight}`}>
                  {m.value}
                </div>
                <p className={`text-xs mt-1 flex items-center gap-1 ${m.accent ? 'text-slate-400' : 'text-slate-500'}`}>
                  {m.sub}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics & Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Trend Chart (7 cols) */}
        <Card className="lg:col-span-7 bg-white border-slate-200/80 rounded-2xl shadow-xs">
          <CardHeader className="pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="size-4 text-slate-900" />
                  Monthly Net Salary Trend
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Six months of finalized salary disbursements ({department === 'All' ? 'All departments' : department})
                </CardDescription>
              </div>
              <StatusBadge value="Paid" size="sm" />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div
              className="flex items-end justify-between gap-3 h-52 pt-8 px-2"
              role="img"
              aria-label={trend
                .map((t) => `${niceMonth(t.period)}: ${money(t.amount)}`)
                .join('; ')}
            >
              {trend.map((t) => {
                const heightPct = Math.max(4, Math.round((t.amount / max) * 100));
                const isCurrent = t.period === period;
                return (
                  <div
                    key={t.period}
                    className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer"
                    onClick={() => setPeriod(t.period)}
                  >
                    <span className="text-[10px] font-medium text-slate-500 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {money(t.amount)}
                    </span>
                    <div className="w-full max-w-[42px] bg-slate-100 rounded-t-lg relative flex items-end h-36 overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isCurrent
                            ? 'bg-slate-900 group-hover:bg-slate-800'
                            : 'bg-slate-300 group-hover:bg-slate-400'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium transition-colors ${
                        isCurrent ? 'text-slate-900 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {niceMonth(t.period).split(' ')[0].slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-900" />
                Selected period highlighted
              </span>
              <span>Values in INR (₹)</span>
            </div>
          </CardContent>
        </Card>

        {/* Needs Your Attention (5 cols) */}
        <Card className="lg:col-span-5 bg-white border-slate-200/80 rounded-2xl shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <AlertCircle className="size-4 text-slate-700" />
                Needs Your Attention
              </CardTitle>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {alerts.length} Pending
              </span>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Action items requiring administrative resolution
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex-1 flex flex-col justify-center">
            {alerts.length > 0 ? (
              <div className="space-y-2.5">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.badgeBg}`}>
                          {a.priority}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-900">{a.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{a.detail}</p>
                    </div>
                    <button
                      className="shrink-0 h-7 text-xs px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-medium text-slate-700 inline-flex items-center gap-1 transition-colors shadow-2xs"
                      onClick={() => navigate(a.view, a.employeeId)}
                    >
                      Resolve <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty className="py-8">
                <EmptyMedia variant="icon" className="bg-slate-100 text-slate-500">
                  <CheckCircle2 className="size-5 text-slate-700" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle className="text-sm font-semibold text-slate-800">
                    All caught up!
                  </EmptyTitle>
                  <EmptyDescription className="text-xs text-slate-400">
                    No pending items or warnings for {niceMonth(period)}.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Operations Grid (Department Cost & Attendance) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Salary Cost */}
        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="size-4 text-slate-600" />
                  Salary Cost by Department
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Gross salary expenditure breakdown
                </CardDescription>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                Gross Cost
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {deptRows.length > 0 && slips.length > 0 ? (
              deptRows.map((d) => (
                <div key={d.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{d.name}</span>
                    <span className="font-semibold text-slate-900">{money(d.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all duration-300"
                      style={{ width: `${(d.amount / maxDept) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <Empty className="py-6">
                <EmptyHeader>
                  <EmptyTitle className="text-xs text-slate-500">
                    No gross salary recorded
                  </EmptyTitle>
                  <EmptyDescription className="text-xs text-slate-400">
                    Compute a payrun to see department expenditure.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card className="bg-white border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Clock3 className="size-4 text-slate-600" />
                  Attendance Health & Overview
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Recorded shifts and punctuality for {niceMonth(period)}
                </CardDescription>
              </div>
              <button
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                onClick={() => navigate('attendance')}
              >
                View logs <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { label: 'Present', val: present.length },
                { label: 'Late', val: late },
                { label: 'Absent', val: attendance.length - present.length },
                { label: 'Over 9h', val: attendance.filter((a) => hours(a) > 9).length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 text-center"
                >
                  <div className="text-xl font-bold tracking-tight text-slate-900">{stat.val}</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-400" />
                {missing} missing check-outs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-400" />
                {attendance.filter((a) => a.edited).length} manual entries
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              * Late entries are included in present totals. Missing records are not inferred.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Off Overview */}
        <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays className="size-4 text-slate-600" />
                Time Off Policies & Balances
              </CardTitle>
              <button
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                onClick={() => navigate('requests')}
              >
                Requests <ArrowUpRight className="size-3.5" />
              </button>
            </div>
          </CardHeader>
          <div className="p-0">
            <DataTable
              rows={s.leaveTypes}
              columns={[
                { title: 'Leave Type', render: (t) => <span className="font-medium text-slate-900">{t.name}</span> },
                {
                  title: 'Approved',
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
                  title: 'Pending',
                  render: (t) => {
                    const count = requests.filter((r) => r.typeId === t.id && r.status === 'Pending').length;
                    return count > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {count} pending
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">0</span>
                    );
                  },
                },
                {
                  title: 'Pool Balance',
                  render: (t) =>
                    t.requiresAllocation
                      ? s.allocations
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
                      : <span className="text-slate-400 text-xs">Unlimited</span>,
                },
              ]}
            />
          </div>
        </Card>

        {/* Department Headcount Overview */}
        <Card className="bg-white border-slate-200/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="size-4 text-slate-600" />
                Department Headcount & Cost
              </CardTitle>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {employees.filter((e) => e.status === 'Active').length} Active Staff
              </span>
            </div>
          </CardHeader>
          <div className="p-0">
            <DataTable
              rows={deptRows}
              columns={[
                { title: 'Department', render: (d) => <span className="font-medium text-slate-900">{d.name}</span> },
                {
                  title: 'Headcount',
                  render: (d) => (
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                      <Users className="size-3 text-slate-400" />
                      {d.count}
                    </span>
                  ),
                },
                {
                  title: 'Gross Salary Cost',
                  render: (d) => <span className="font-semibold text-slate-900">{money(d.amount)}</span>,
                },
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Payrun Summary Card styled as Workora Execution Logs */}
      <Card className="bg-white border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-100">
          <div className="flex items-center gap-6">
            <button className="pb-3 text-sm font-semibold text-slate-900 border-b-2 border-slate-900 flex items-center gap-2">
              <FileText className="size-4 text-slate-700" />
              Execution Logs ({niceMonth(period)})
            </button>
            <button className="pb-3 text-sm font-medium text-slate-400 hover:text-slate-600">
              Data Preview
            </button>
            <button className="pb-3 text-sm font-medium text-slate-400 hover:text-slate-600">
              Variables
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-medium text-slate-600 hover:text-slate-900 rounded-full h-8"
            onClick={() => navigate('payruns')}
          >
            All payruns <ArrowUpRight className="size-3.5 ml-1" />
          </Button>
        </div>
        <div className="p-0">
          <DataTable
            rows={s.payruns
              .filter(
                (r) => r.period === period && r.employeeIds.some((id: string) => ids.has(id))
              )
              .slice()
              .reverse()}
            empty="No payruns created for this period. Click 'New payrun' above to create one."
            columns={[
              {
                title: 'Payrun Name',
                render: (r) => (
                  <button
                    className="font-medium text-slate-900 hover:text-orange-600 hover:underline flex items-center gap-1.5"
                    onClick={() => navigate('run', r.id)}
                  >
                    {r.name}
                    <ArrowUpRight className="size-3" />
                  </button>
                ),
              },
              {
                title: 'Salary Structure',
                render: (r) => (
                  <span className="text-slate-600">
                    {s.structures.find((st) => st.id === r.structureId)?.name || 'Standard'}
                  </span>
                ),
              },
              {
                title: 'Staff Included',
                render: (r) => (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Users className="size-3 text-slate-400" />
                    {r.employeeIds.filter((id: string) => ids.has(id)).length}
                  </span>
                ),
              },
              {
                title: 'Net Salary',
                render: (r) => (
                  <span className="font-semibold text-slate-900">
                    {money(
                      r.slips
                        .filter((p: Row) => ids.has(p.employeeId))
                        .reduce((n: number, p: Row) => n + p.net, 0)
                    )}
                  </span>
                ),
              },
              {
                title: 'Status',
                render: (r) => <Badge value={r.status} />,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
