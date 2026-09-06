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

const EMPLOYEE_LINKED_COLLECTIONS = new Set([
  'contracts',
  'attendance',
  'requests',
  'allocations',
]);

const stringValue = (value: unknown) => typeof value === 'string' ? value : '';

function managerCanAccessRecord(
  user: JwtPayload,
  workspace: Workspace,
  collection: string,
  record?: Row,
) {
  if (!record) return false;
  const assigned = new Set(user.assignedEmployeeIds || []);
  if (collection === 'employees') return !!record.id && assigned.has(record.id);
  if (!EMPLOYEE_LINKED_COLLECTIONS.has(collection)) return false;

  const employeeId = String(record.employeeId || '');
  if (!assigned.has(employeeId)) return false;
  const existing = workspace[collection as 'contracts' | 'attendance' | 'requests' | 'allocations']
    .find((item) => item.id === record.id);
  return !existing || assigned.has(existing.employeeId);
}

export function canMutateWorkspace(
  user: JwtPayload,
  workspace: Workspace,
  action: string,
  payload: Record<string, unknown>
): boolean {
  if (user.role === 'Admin') return true;

  if (action === 'save') {
    const collection = stringValue(payload.collection);
    const record = payload.record as Row | undefined;
    if (!record) return false;

    if (user.role === 'HR Payroll Manager') return true;
    if (user.role === 'HR Manager')
      return managerCanAccessRecord(user, workspace, collection, record);
    if (user.role === 'HR Payroll User') return HR_COLLECTIONS.has(collection);
    return user.role === 'Employee' && !!user.employeeId && ownsEmployeeRecord(workspace, collection, record, user.employeeId);
  }

  if (action === 'delete') {
    const collection = stringValue(payload.collection);
    if (user.role === 'HR Payroll Manager') return true;
    if (user.role === 'HR Manager') {
      const records = workspace[collection as keyof Workspace];
      const record = Array.isArray(records)
        ? (records as Row[]).find((item) => item.id === payload.id)
        : undefined;
      return managerCanAccessRecord(user, workspace, collection, record);
    }
    if (user.role === 'HR Payroll User') return HR_COLLECTIONS.has(collection) || collection === 'payruns';
    return false;
  }

  if (action === 'approveAllocation') {
    if (user.role === 'HR Manager') {
      const allocation = workspace.allocations.find((item) => item.id === payload.id);
      return !!allocation && (user.assignedEmployeeIds || []).includes(allocation.employeeId);
    }
    return user.role === 'HR Payroll Manager';
  }

  if (['approveLeave', 'refuseLeave'].includes(action)) {
    const request = workspace.requests.find((item) => item.id === payload.id);
    const leaveType = workspace.leaveTypes.find((item) => item.id === request?.typeId);
    if (!request || !leaveType || leaveType.approvalWorkflow === 'No Approval') return false;
    if (user.role === 'HR Manager') {
      return (user.assignedEmployeeIds || []).includes(request.employeeId);
    }
    if (leaveType.approvalWorkflow === 'Manager Approval') return false;
    return user.role === 'HR Payroll Manager';
  }

  if (action === 'createPayrun' || action === 'compute') {
    return ['HR Payroll User', 'HR Payroll Manager'].includes(user.role);
  }

  if (action === 'validate' || action === 'markPaid') {
    return user.role === 'HR Payroll Manager';
  }

  if (action === 'clock') {
    if (user.role === 'HR Manager')
      return (user.assignedEmployeeIds || []).includes(stringValue(payload.employeeId));
    if (['HR Payroll User', 'HR Payroll Manager'].includes(user.role)) return true;
    return user.role === 'Employee' && !!user.employeeId && payload.employeeId === user.employeeId;
  }

  return false;
}

export function visibleWorkspace(workspace: Workspace, user: JwtPayload): Workspace {
  if (['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(user.role)) return workspace;

  if (user.role === 'HR Manager') {
    const assigned = new Set(user.assignedEmployeeIds || []);
    const employees = workspace.employees.filter((item) => assigned.has(item.id));
    const schedules = new Set([
      ...employees.map((item) => item.scheduleId),
      ...workspace.contracts
        .filter((item) => assigned.has(item.employeeId))
        .map((item) => item.scheduleId),
    ].filter(Boolean));
    return {
      ...workspace,
      employees,
      contracts: workspace.contracts.filter((item) => assigned.has(item.employeeId)),
      attendance: workspace.attendance.filter((item) => assigned.has(item.employeeId)),
      requests: workspace.requests.filter((item) => assigned.has(item.employeeId)),
      allocations: workspace.allocations.filter((item) => assigned.has(item.employeeId)),
      schedules: workspace.schedules.filter((item) => schedules.has(item.id)),
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
