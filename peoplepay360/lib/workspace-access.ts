import type { JwtPayload } from './jwt';
import type { Row, Workspace } from './domain';

const HR_COLLECTIONS = new Set([
  'employees',
  'contracts',
  'attendance',
  'requests',
  'allocations',
  'leaveTypes',
  'schedules',
]);

function ownsEmployeeRecord(workspace: Workspace, collection: string, record: Row, employeeId: string) {
  if (!['attendance', 'requests'].includes(collection) || record.employeeId !== employeeId) return false;
  const existing = workspace[collection as 'attendance' | 'requests'].find((item) => item.id === record.id);
  return !existing || existing.employeeId === employeeId;
}

export function canMutateWorkspace(
  user: JwtPayload,
  workspace: Workspace,
  action: string,
  payload: Record<string, any>
): boolean {
  if (user.role === 'Admin') return true;

  if (action === 'save') {
    const collection = String(payload.collection || '');
    const record = payload.record as Row | undefined;
    if (!record) return false;

    if (user.role === 'HR Payroll Manager') return true;
    if (user.role === 'HR Manager' || user.role === 'HR Payroll User') {
      return HR_COLLECTIONS.has(collection);
    }
    return user.role === 'Employee' && !!user.employeeId && ownsEmployeeRecord(workspace, collection, record, user.employeeId);
  }

  if (action === 'delete') {
    const collection = String(payload.collection || '');
    if (user.role === 'HR Payroll Manager') return true;
    if (user.role === 'HR Manager') return HR_COLLECTIONS.has(collection);
    if (user.role === 'HR Payroll User') return HR_COLLECTIONS.has(collection) || collection === 'payruns';
    return false;
  }

  if (['approveLeave', 'refuseLeave', 'approveAllocation'].includes(action)) {
    return ['HR Manager', 'HR Payroll User', 'HR Payroll Manager'].includes(user.role);
  }

  if (action === 'createPayrun' || action === 'compute') {
    return ['HR Payroll User', 'HR Payroll Manager'].includes(user.role);
  }

  if (action === 'validate' || action === 'markPaid') {
    return user.role === 'HR Payroll Manager';
  }

  if (action === 'clock') {
    if (['HR Manager', 'HR Payroll User', 'HR Payroll Manager'].includes(user.role)) return true;
    return user.role === 'Employee' && !!user.employeeId && payload.employeeId === user.employeeId;
  }

  return false;
}

export function visibleWorkspace(workspace: Workspace, user: JwtPayload): Workspace {
  if (['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(user.role)) return workspace;

  if (user.role === 'HR Manager') {
    return {
      ...workspace,
      rules: [],
      structures: workspace.structures.map(({ ruleIds: _ruleIds, ...structure }) => ({
        ...structure,
        ruleIds: [],
      })),
      payruns: [],
      audit: [],
    };
  }

  const employeeId = user.employeeId;
  const employees = employeeId ? workspace.employees.filter((item) => item.id === employeeId) : [];
  const scheduleIds = new Set(employees.map((item) => item.scheduleId).filter(Boolean));
  const payruns = employeeId
    ? workspace.payruns
        .filter((run) => run.employeeIds.includes(employeeId))
        .map((run) => ({
          ...run,
          employeeIds: [employeeId],
          slips: run.slips.filter((slip: Row) => slip.employeeId === employeeId),
        }))
    : [];

  return {
    employees,
    contracts: employeeId ? workspace.contracts.filter((item) => item.employeeId === employeeId) : [],
    attendance: employeeId ? workspace.attendance.filter((item) => item.employeeId === employeeId) : [],
    requests: employeeId ? workspace.requests.filter((item) => item.employeeId === employeeId) : [],
    allocations: employeeId ? workspace.allocations.filter((item) => item.employeeId === employeeId) : [],
    leaveTypes: workspace.leaveTypes,
    rules: [],
    structures: workspace.structures.map(({ ruleIds: _ruleIds, ...structure }) => ({
      ...structure,
      ruleIds: [],
    })),
    schedules: workspace.schedules.filter((item) => scheduleIds.has(item.id)),
    payruns,
    audit: [],
  };
}
