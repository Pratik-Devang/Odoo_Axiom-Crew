import {
  type Workspace,
  type Row,
  hours,
  monthEnd,
  employeeSchedule,
  scheduleRowForDate,
  activeContract,
  computeSlip,
} from './domain';
import type {
  DashboardFilters,
  DashboardSnapshot,
  DepartmentShareRow,
  EmployeeRosterRow,
  TopEarnerRow,
  TrendPoint,
  WorkforceHealthMetrics,
} from './dashboard-types';

/* ─── Period helpers ─── */

export function periodAdd(period: string, delta: number): string {
  const date = new Date(period + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

export function buildTimelineMonths(anchor: string, length = 12): string[] {
  return Array.from({ length }, (_, i) => periodAdd(anchor, i - (length - 1)));
}

export function monthShort(period: string): string {
  return new Date(period + '-01T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Inclusive YYYY-MM-DD range for a payroll period (more reliable than startsWith alone). */
export function attendanceInPeriod(
  attendance: Row[],
  employeeIds: Set<string>,
  period: string,
): Row[] {
  const start = period + '-01';
  const end = monthEnd(period);
  return attendance.filter(
    (a) => employeeIds.has(a.employeeId) && a.date >= start && a.date <= end,
  );
}

export function attendanceForEmployee(
  attendance: Row[],
  employeeId: string,
  period: string,
): Row[] {
  const start = period + '-01';
  const end = monthEnd(period);
  return attendance.filter(
    (a) => a.employeeId === employeeId && a.date >= start && a.date <= end,
  );
}

/** Present-day rate for one employee; null when no attendance rows exist for the period. */
export function getEmployeeAttendanceRate(
  attendance: Row[],
  employeeId: string,
  period: string,
): number | null {
  const rows = attendanceForEmployee(attendance, employeeId, period);
  if (!rows.length) return null;
  return Math.round(
    (rows.filter((a) => Boolean(a.checkIn)).length / rows.length) * 100,
  );
}

/* ─── Payroll estimates ─── */

export function estimatePeriodNet(
  s: Workspace,
  employeeIds: Iterable<string>,
  period: string,
): number {
  let total = 0;
  for (const id of employeeIds) {
    const emp = s.employees.find((e) => e.id === id);
    if (!emp || emp.status !== 'Active') continue;
    try {
      const contract = activeContract(s, id, period);
      total += computeSlip(s, id, period, contract.structureId).net;
    } catch {
      // no applicable contract for this period
    }
  }
  return total;
}

type PayLookup = (
  employeeId: string,
  period: string,
  slip?: Row,
) => { net: number; gross: number; hasSlip: boolean };

export function employeeNetForPeriod(
  s: Workspace,
  employeeId: string,
  period: string,
  slip?: Row,
): { net: number; gross: number; hasSlip: boolean } {
  if (slip) {
    return { net: slip.net, gross: slip.gross || slip.net, hasSlip: true };
  }
  try {
    const contract = activeContract(s, employeeId, period);
    const computed = computeSlip(s, employeeId, period, contract.structureId);
    return { net: computed.net, gross: computed.gross, hasSlip: false };
  } catch {
    return { net: 0, gross: 0, hasSlip: false };
  }
}

/* ─── Filtered employees ─── */

export function filterEmployees(
  s: Workspace,
  filters: DashboardFilters,
): Row[] {
  return s.employees.filter(
    (e) =>
      (filters.department === 'All' || e.department === filters.department) &&
      (filters.employeeType === 'All' || e.type === filters.employeeType),
  );
}

export function filterEmployeesWithSearch(
  s: Workspace,
  filters: DashboardFilters,
  query: string,
): Row[] {
  const normalized = query.trim().toLowerCase();
  return filterEmployees(s, filters).filter(
    (e) =>
      !normalized ||
      [e.name, e.department, e.position, e.type].some((x) =>
        String(x).toLowerCase().includes(normalized),
      ),
  );
}

/* ─── Aggregations ─── */

export function getWorkforceHealth(
  s: Workspace,
  employeeIds: Set<string>,
  period: string,
): WorkforceHealthMetrics {
  const attendance = attendanceInPeriod(s.attendance, employeeIds, period);
  const present = attendance.filter((a) => a.checkIn);
  const complete = present.filter((a) => a.checkOut);
  const late = present.filter((a) => {
    const row = scheduleRowForDate(
      employeeSchedule(s, a.employeeId, a.date),
      a.date,
    );
    return a.checkIn > (row?.start || '09:00');
  }).length;
  const absent = Math.max(attendance.length - present.length, 0);
  const overtime = attendance.filter((a) => hours(a) > 9).length;
  const missingCheckout = present.filter((a) => !a.checkOut).length;
  const manualEntries = attendance.filter((a) => Boolean(a.edited)).length;
  const healthRate = attendance.length
    ? Math.round((complete.length / attendance.length) * 100)
    : null;

  const requests = s.requests.filter(
    (r) =>
      employeeIds.has(r.employeeId) &&
      r.start <= monthEnd(period) &&
      r.end >= period + '-01',
  );
  const approvedTimeOffDays = requests
    .filter((r) => r.status === 'Approved')
    .reduce((n, r) => n + (r.duration || 0), 0);
  const pendingRequests = requests.filter((r) => r.status === 'Pending').length;

  return {
    presentCount: present.length,
    completeCount: complete.length,
    lateCount: late,
    absentCount: absent,
    overtimeCount: overtime,
    missingCheckoutCount: missingCheckout,
    manualEntryCount: manualEntries,
    healthRate,
    approvedTimeOffDays,
    pendingRequests,
  };
}

export function getDepartmentShare(
  s: Workspace,
  departments: string[],
  employees: Row[],
  slips: Row[],
  period: string,
  departmentFilter: string,
  getPay: PayLookup = (employeeId, payPeriod, slip) =>
    employeeNetForPeriod(s, employeeId, payPeriod, slip),
): { rows: DepartmentShareRow[]; totalAmount: number } {
  const rows = departments
    .filter((d) => departmentFilter === 'All' || departmentFilter === d)
    .map((d) => {
      const deptEmps = employees.filter(
        (e) => e.department === d && e.status === 'Active',
      );
      const deptIds = deptEmps.map((e) => e.id);
      const deptSlipsAmount = slips
        .filter((p) => deptIds.includes(p.employeeId))
        .reduce((n, p) => n + p.net, 0);
      const amount =
        deptSlipsAmount > 0
          ? deptSlipsAmount
          : deptIds.reduce((sum, id) => sum + getPay(id, period).net, 0);
      return { name: d, count: deptEmps.length, amount };
    })
    .filter((d) => d.count > 0)
    .sort((a, b) => b.amount - a.amount);

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0) || 1;
  return { rows, totalAmount };
}

export function getNetSalaryTrend(
  s: Workspace,
  employeeIds: Set<string>,
  period: string,
  months = 6,
  getPay: PayLookup = (employeeId, payPeriod, slip) =>
    employeeNetForPeriod(s, employeeId, payPeriod, slip),
): TrendPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date(period + '-01T00:00:00Z');
    date.setUTCMonth(date.getUTCMonth() - (months - 1) + i);
    const p = date.toISOString().slice(0, 7);

    const periodRuns = s.payruns.filter((r) => r.period === p);
    const periodSlips = periodRuns
      .flatMap((r) => r.slips)
      .filter((slip: Row) => employeeIds.has(slip.employeeId));

    const realNet = periodSlips.reduce(
      (n: number, slip: Row) => n + slip.net,
      0,
    );
    // Contract evaluation is the expensive path. Avoid doing it when actual
    // payslips already provide the value for this period.
    const value =
      realNet > 0
        ? realNet
        : [...employeeIds].reduce((sum, id) => sum + getPay(id, p).net, 0);

    return {
      period: p,
      label: monthShort(p),
      value,
      isProjected: realNet === 0,
    };
  });
}

export function getTopNetPay(
  s: Workspace,
  activeEmployees: Row[],
  slips: Row[],
  period: string,
  limit = 5,
  getPay: PayLookup = (employeeId, payPeriod, slip) =>
    employeeNetForPeriod(s, employeeId, payPeriod, slip),
): { earners: TopEarnerRow[]; maxNet: number } {
  const earners = activeEmployees
    .map((e) => {
      const slip = slips.find((p) => p.employeeId === e.id);
      const { net, hasSlip } = getPay(e.id, period, slip);
      return { id: e.id, name: e.name, department: e.department, net, hasSlip };
    })
    .sort((a, b) => b.net - a.net)
    .slice(0, limit);

  return { earners, maxNet: earners[0]?.net || 1 };
}

export function getTimelineMonths(s: Workspace, period: string): string[] {
  const periods = [...s.payruns.map((r) => r.period), period];
  const end = periods.sort().at(-1)!;
  const months = buildTimelineMonths(end, 12);
  return months.includes(period) ? months : buildTimelineMonths(period, 12);
}

export function getEmployeeRosterRows(
  s: Workspace,
  filters: DashboardFilters,
  query: string,
): EmployeeRosterRow[] {
  return filterEmployeesWithSearch(s, filters, query).map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
    type: e.type,
    status: e.status,
    attendanceRate: getEmployeeAttendanceRate(
      s.attendance,
      e.id,
      filters.period,
    ),
  }));
}

/** Full dashboard snapshot — pure function, no React. */
export function buildDashboardSnapshot(
  s: Workspace,
  filters: DashboardFilters,
): DashboardSnapshot {
  const departments = [...new Set(s.employees.map((e) => e.department))];
  const employees = filterEmployees(s, filters);
  const activeEmployees = employees.filter((e) => e.status === 'Active');
  const filteredEmployeeIds = new Set(employees.map((e) => e.id));

  const selectedRuns = s.payruns.filter((r) => r.period === filters.period);
  const currentPayrun = selectedRuns[0];
  const slips = selectedRuns
    .flatMap((r) => r.slips.map((p: Row) => ({ ...p, runStatus: r.status })))
    .filter((p) => filteredEmployeeIds.has(p.employeeId));
  const payCache = new Map<string, ReturnType<typeof employeeNetForPeriod>>();
  const getPay: PayLookup = (employeeId, payPeriod, slip) => {
    if (slip) return employeeNetForPeriod(s, employeeId, payPeriod, slip);
    const key = `${payPeriod}:${employeeId}`;
    const cached = payCache.get(key);
    if (cached) return cached;
    const pay = employeeNetForPeriod(s, employeeId, payPeriod);
    payCache.set(key, pay);
    return pay;
  };

  const hasActualPayroll = slips.length > 0;
  const estimatedNet = hasActualPayroll
    ? 0
    : [...filteredEmployeeIds].reduce(
        (sum, id) => sum + getPay(id, filters.period).net,
        0,
      );
  const totalNet = hasActualPayroll
    ? slips.reduce((n, p) => n + p.net, 0)
    : estimatedNet;
  const totalGross = hasActualPayroll
    ? slips.reduce((n, p) => n + (p.gross || 0), 0)
    : activeEmployees.reduce(
        (n, e) => n + getPay(e.id, filters.period).gross,
        0,
      );
  const totalDeductions = hasActualPayroll
    ? slips.reduce((n, p) => n + (p.deductions || 0), 0)
    : Math.max(0, totalGross - totalNet);
  const avgNet = activeEmployees.length ? totalNet / activeEmployees.length : 0;
  const paidSlips = slips.filter((p) => p.runStatus === 'Paid').length;

  const workforceHealth = getWorkforceHealth(
    s,
    filteredEmployeeIds,
    filters.period,
  );
  const trend = getNetSalaryTrend(
    s,
    filteredEmployeeIds,
    filters.period,
<<<<<<< HEAD
    12,
=======
    6,
>>>>>>> f00691d7551c679eb78c2451d43fa3f00da45a1e
    getPay,
  );
  const prevMonthNet = trend[trend.length - 2]?.value || totalNet;
  const deltaPct =
    prevMonthNet > 0 ? ((totalNet - prevMonthNet) / prevMonthNet) * 100 : 0;
  const deltaLabel = hasActualPayroll
    ? prevMonthNet > 0
      ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prev month`
      : 'First payrun'
    : 'Not yet run for this period';

  const { rows: departmentShare, totalAmount: totalDepartmentAmount } =
    getDepartmentShare(
      s,
      departments,
      employees,
      slips,
      filters.period,
      filters.department,
      getPay,
    );

  const timelineMonths = getTimelineMonths(s, filters.period);
  const timelineIndex = Math.max(0, timelineMonths.indexOf(filters.period));
  const { earners: topEarners, maxNet: maxEarnerNet } = getTopNetPay(
    s,
    activeEmployees,
    slips,
    filters.period,
    5,
    getPay,
  );

  return {
    departments,
    filteredEmployeeIds,
    activeEmployees,
    slips,
    currentPayrun,
    kpis: {
      totalNet,
      totalGross,
      totalDeductions,
      avgNet,
      deltaLabel,
      hasActualPayroll,
      paidSlips,
      slipCount: slips.length,
      activeEmployeeCount: activeEmployees.length,
      healthRate: workforceHealth.healthRate,
      lateCount: workforceHealth.lateCount,
      approvedTimeOffDays: workforceHealth.approvedTimeOffDays,
      pendingRequests: workforceHealth.pendingRequests,
      payrunStatus: currentPayrun?.status,
      hasPayrun: selectedRuns.length > 0,
    },
    trend,
    timelineMonths,
    timelineIndex,
    departmentShare,
    totalDepartmentAmount,
    workforceHealth,
    topEarners,
    maxEarnerNet,
  };
}
