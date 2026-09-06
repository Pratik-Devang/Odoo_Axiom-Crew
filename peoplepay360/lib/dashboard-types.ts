import type { Row } from './domain';

export interface DashboardFilters {
  period: string;
  department: string;
  employeeType: string;
}

export interface TrendPoint {
  period: string;
  label: string;
  value: number;
  isProjected: boolean;
}

export interface DepartmentShareRow {
  name: string;
  count: number;
  amount: number;
}

export interface WorkforceHealthMetrics {
  presentCount: number;
  completeCount: number;
  lateCount: number;
  absentCount: number;
  overtimeCount: number;
  missingCheckoutCount: number;
  manualEntryCount: number;
  healthRate: number | null;
  approvedTimeOffDays: number;
  pendingRequests: number;
}

export interface TopEarnerRow {
  id: string;
  name: string;
  department: string;
  net: number;
  hasSlip: boolean;
}

export interface DashboardKpis {
  totalNet: number;
  totalGross: number;
  totalDeductions: number;
  avgNet: number;
  deltaLabel: string;
  hasActualPayroll: boolean;
  paidSlips: number;
  slipCount: number;
  activeEmployeeCount: number;
  healthRate: number | null;
  lateCount: number;
  approvedTimeOffDays: number;
  pendingRequests: number;
  payrunStatus?: string;
  hasPayrun: boolean;
}

export interface DashboardSnapshot {
  departments: string[];
  filteredEmployeeIds: Set<string>;
  activeEmployees: Row[];
  slips: Row[];
  currentPayrun?: Row;
  kpis: DashboardKpis;
  trend: TrendPoint[];
  timelineMonths: string[];
  timelineIndex: number;
  departmentShare: DepartmentShareRow[];
  totalDepartmentAmount: number;
  workforceHealth: WorkforceHealthMetrics;
  topEarners: TopEarnerRow[];
  maxEarnerNet: number;
}

export interface EmployeeRosterRow {
  id: string;
  name: string;
  department: string;
  type: string;
  status: string;
  attendanceRate: number | null;
}
