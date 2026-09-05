'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Picker } from './peoplepay-ui';
import { type Row, type Workspace } from '@/lib/domain';

export const titles: Record<string, string> = {
  employees: 'Employees',
  contracts: 'Contracts',
  attendance: 'Attendance',
  requests: 'Time off requests',
  allocations: 'Allocations',
  leaveTypes: 'Time off types',
  rules: 'Salary rules',
  structures: 'Salary structures',
  schedules: 'Working schedules',
  payruns: 'Payruns',
  payslips: 'Payslips',
  overview: 'Payroll overview',
  run: 'Payrun',
  employee: 'Employee profile',
  users: 'System Users',
};

export function defaults(collection: string, s: Workspace, employeeId?: string): Row {
  const employee = employeeId || s.employees[0]?.id || '';
  const structure = s.structures[0]?.id || '';
  const schedule = s.schedules[0]?.id || '';
  // Derive default department and manager from existing employees (live from DB-backed workspace)
  const departments = [...new Set(s.employees.map((e) => e.department))].sort();
  const defaultDept = departments[0] || 'Engineering';
  const managers = s.employees.filter((e) => e.status !== 'Archived');
  const defaultManager = managers[0]?.name || '';
  const locations = [...new Set(s.employees.filter((e) => e.location).map((e) => e.location))].sort();
  const defaultLocation = locations[0] || 'Mumbai';

  const records: Record<string, any> = {
    employees: {
      name: '',
      email: '',
      phone: '',
      department: defaultDept,
      position: '',
      type: 'Full-time',
      status: 'Active',
      manager: defaultManager,
      location: defaultLocation,
      scheduleId: schedule,
      bank: '',
    },
    contracts: {
      employeeId: employee,
      start: '2026-10-01',
      end: '',
      wage: 50000,
      structureId: structure,
      scheduleId: schedule,
      status: 'Running',
    },
    attendance: { employeeId: employee, date: '2026-09-05', checkIn: '09:00', checkOut: '18:00' },
    requests: {
      employeeId: employee,
      typeId: s.leaveTypes[0]?.id || 'paid',
      start: '2026-09-14',
      end: '2026-09-14',
      duration: 1,
      reason: '',
      status: 'Pending',
    },
    allocations: {
      employeeId: employee,
      typeId: s.leaveTypes[0]?.id || 'paid',
      amount: 20,
      start: '2027-01-01',
      end: '2027-12-31',
      status: 'Pending',
    },
    leaveTypes: {
      name: '',
      unit: 'Days',
      requiresAllocation: true,
      approval: 'Manager',
      payrollWorkEntry: '',
      displayColor: 'Blue',
      active: true,
    },
    rules: { name: '', code: '', category: 'Allowance', sequence: 40, method: 'Fixed', base: 'WAGE', value: 0, expression: '' },
    structures: { name: '', ruleIds: [], active: true },
    schedules: { name: '', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], start: '09:00', end: '18:00', breakHours: 1 },
    users: { name: '', email: '', roleId: 'employee', employeeId: '', password: '', active: true },
  };
  return { id: '', ...records[collection] };
}

// ── Color map for leave type display colors ──────────────────────────────────
const DISPLAY_COLORS = [
  { value: 'Blue', label: '🔵 Blue' },
  { value: 'Red', label: '🔴 Red' },
  { value: 'Green', label: '🟢 Green' },
  { value: 'Orange', label: '🟠 Orange' },
  { value: 'Purple', label: '🟣 Purple' },
  { value: 'Yellow', label: '🟡 Yellow' },
  { value: 'Gray', label: '⚫ Gray' },
];

export default function RecordForm({
  collection,
  initial,
  s,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  collection: string;
  initial: Row;
  s: Workspace;
  busy: boolean;
  onSave: (record: Row) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}) {
  const [r, setR] = useState<Row>(initial);
  const set = (key: string, value: any) => setR((old) => ({ ...old, [key]: value }));

  // ── Generic helpers ──────────────────────────────────────────────────────
  const input = (key: string, label: string, type = 'text', required = true) => (
    <Field key={key} label={label}>
      <Input
        aria-label={label}
        type={type}
        required={required}
        value={r[key] ?? ''}
        onChange={(e) => set(key, e.target.value)}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? 0 : undefined}
      />
    </Field>
  );

  const pick = (key: string, label: string, options: (string | { value: string; label: string })[]) => (
    <Field key={key} label={label}>
      <Picker label={label} value={r[key] ?? ''} onChange={(v) => set(key, v)} options={options} />
    </Field>
  );

  // ── Dynamic pickers — data fetched from live workspace (DB-backed) ────────

  /** Employee picker — all active employees from DB */
  const employeePick = () =>
    pick('employeeId', 'Employee', s.employees.map((e) => ({ value: e.id, label: e.name })));

  /** Schedule picker — all schedules from DB */
  const schedulePick = () =>
    pick('scheduleId', 'Working schedule', s.schedules.map((e) => ({ value: e.id, label: e.name })));

  /** Salary structure picker — all structures from DB */
  const structurePick = () =>
    pick('structureId', 'Salary structure', s.structures.map((e) => ({ value: e.id, label: e.name })));

  /** Leave type picker — all leave types from DB */
  const typePick = () =>
    pick('typeId', 'Time off type', s.leaveTypes.map((e) => ({ value: e.id, label: e.name })));

  /** System role picker — static list (roles defined in RBAC seed) */
  const rolePick = () =>
    pick('roleId', 'System Role', [
      { value: 'admin', label: 'Admin' },
      { value: 'payroll_manager', label: 'HR Payroll Manager' },
      { value: 'payroll_user', label: 'HR Payroll User' },
      { value: 'hr_manager', label: 'HR Manager' },
      { value: 'employee', label: 'Employee' },
    ]);

  /**
   * Department picker — unique departments derived from employees in DB.
   * Also allows typing a new department name via a fallback input if
   * the list is empty or the user wants a new value.
   */
  const departmentPick = () => {
    const depts = [...new Set(s.employees.map((e) => e.department))].sort();
    return pick(
      'department',
      'Department',
      depts.map((d) => ({ value: d, label: d }))
    );
  };

  /**
   * Manager picker — employee names from DB (any active employee can be a manager).
   */
  const managerPick = () => {
    const options: { value: string; label: string }[] = [
      { value: '', label: '— None —' },
      ...s.employees
        .filter((e) => e.status !== 'Archived')
        .map((e) => ({ value: e.name, label: `${e.name} (${e.department})` })),
    ];
    return pick('manager', 'Manager', options);
  };

  /**
   * Location picker — unique work locations from DB.
   */
  const locationPick = () => {
    const locs = [...new Set(s.employees.filter((e) => e.location).map((e) => e.location))].sort();
    const options: { value: string; label: string }[] =
      locs.length > 0
        ? locs.map((l) => ({ value: l, label: l }))
        : [{ value: 'Mumbai', label: 'Mumbai' }, { value: 'Delhi', label: 'Delhi' }, { value: 'Bangalore', label: 'Bangalore' }, { value: 'Remote', label: 'Remote' }];
    return pick('location', 'Work location', options);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void onSave(r); }}>
      <div className="form-grid">

        {/* ── Employees ───────────────────────────────────────────────────── */}
        {collection === 'employees' && (
          <>
            {input('name', 'Full name')}
            {input('email', 'Work email', 'email')}
            {input('position', 'Job position')}
            {departmentPick()}
            {pick('type', 'Employee type', ['Full-time', 'Contract', 'Intern'])}
            {pick('status', 'Status', ['Active', 'Archived'])}
            {managerPick()}
            {schedulePick()}
            {locationPick()}
            {input('phone', 'Phone', 'tel', false)}
            {input('bank', 'Bank account reference', 'text', false)}
          </>
        )}

        {/* ── Contracts ───────────────────────────────────────────────────── */}
        {collection === 'contracts' && (
          <>
            {employeePick()}
            {input('wage', 'Monthly contract wage (INR)', 'number')}
            {input('start', 'Start date', 'date')}
            {input('end', 'End date (optional)', 'date', false)}
            {structurePick()}
            {schedulePick()}
            <p className="note field wide">
              Keep historical contracts. Contract date ranges cannot overlap. End an existing open-ended
              contract before adding its successor; payroll currently requires one contract covering the
              full month.
            </p>
          </>
        )}

        {/* ── Attendance ──────────────────────────────────────────────────── */}
        {collection === 'attendance' && (
          <>
            {employeePick()}
            {input('date', 'Date', 'date')}
            {input('checkIn', 'Check-in', 'time', false)}
            {input('checkOut', 'Check-out', 'time', false)}
            <p className="note field wide">
              One record per employee per day. Leave both times empty to record absence. Worked hours are
              calculated from check-in and check-out.
            </p>
          </>
        )}

        {/* ── Time Off Requests ────────────────────────────────────────────── */}
        {collection === 'requests' && (
          <>
            {employeePick()}
            {typePick()}
            {input('start', 'Start date', 'date')}
            {input('end', 'End date', 'date')}
            {s.leaveTypes.find((t) => t.id === r.typeId)?.unit === 'Hours' &&
              input('duration', 'Requested hours', 'number')}
            {input('reason', 'Reason')}
            <p className="note field wide">
              This prototype counts calendar days inclusively. Requests consume the matching approved
              allocation only after approval.
            </p>
          </>
        )}

        {/* ── Leave Allocations ────────────────────────────────────────────── */}
        {collection === 'allocations' && (
          <>
            {employeePick()}
            {typePick()}
            {input('amount', 'Allocated days / hours', 'number')}
            {input('start', 'Valid from', 'date')}
            {input('end', 'Valid until', 'date')}
            <p className="note field wide">
              An allocation becomes available only after approval. A given employee and leave type can
              have one allocation per non-overlapping validity period.
            </p>
          </>
        )}

        {/* ── Leave Types ─────────────────────────────────────────────────── */}
        {collection === 'leaveTypes' && (
          <>
            {input('name', 'Type name')}
            {pick('unit', 'Unit', ['Days', 'Hours'])}
            {pick('approval', 'Approval', [
              { value: 'Manager', label: 'Manager approval' },
              { value: 'Officer', label: 'HR Officer approval' },
              { value: 'No Validation', label: 'No approval required' },
            ])}
            {pick('displayColor', 'Display color', DISPLAY_COLORS)}
            {input('payrollWorkEntry', 'Payroll / Work Entry type', 'text', false)}
            <label className="check-label">
              <Checkbox
                checked={r.requiresAllocation}
                onCheckedChange={(v) => set('requiresAllocation', v)}
              />
              Requires an approved allocation
            </label>
            <label className="check-label">
              <Checkbox checked={r.active !== false} onCheckedChange={(v) => set('active', v)} />
              Active
            </label>
          </>
        )}

        {/* ── Salary Rules ─────────────────────────────────────────────────── */}
        {collection === 'rules' && (
          <>
            {input('name', 'Rule name')}
            {input('code', 'Code (uppercase)')}
            {pick('category', 'Category', ['Basic', 'Allowance', 'Deduction'])}
            {input('sequence', 'Execution sequence', 'number')}
            {pick('method', 'Computation', ['Fixed', 'Percentage', 'Formula'])}
            {r.method !== 'Formula' && input('value', r.method === 'Fixed' ? 'Amount (INR)' : 'Percentage', 'number')}
            {r.method === 'Percentage' &&
              pick('base', 'Percentage base', [
                { value: 'WAGE', label: 'Contract wage' },
                ...s.rules
                  .filter((x) => x.id !== r.id && x.sequence < +r.sequence)
                  .map((x) => ({ value: x.code, label: `${x.name} (${x.code})` })),
              ])}
            {r.method === 'Formula' && input('expression', 'Formula (e.g. BASIC * 0.1 + 2000)')}
            <p className="note field wide">
              Rules execute in sequence. Formulas support arithmetic, parentheses, WAGE, and earlier rule
              codes. Sample deductions demonstrate the engine; they are not statutory payroll rules.
            </p>
          </>
        )}

        {/* ── Salary Structures ─────────────────────────────────────────────── */}
        {collection === 'structures' && (
          <>
            {input('name', 'Structure name')}
            <label className="check-label">
              <Checkbox checked={r.active} onCheckedChange={(v) => set('active', v)} />
              Active
            </label>
            <div className="field wide check-list">
              <span>Included salary rules</span>
              {s.rules
                .slice()
                .sort((a, b) => a.sequence - b.sequence)
                .map((rule) => (
                  <label key={rule.id}>
                    <Checkbox
                      checked={r.ruleIds.includes(rule.id)}
                      onCheckedChange={(v) =>
                        set('ruleIds', v ? [...r.ruleIds, rule.id] : r.ruleIds.filter((id: string) => id !== rule.id))
                      }
                    />
                    {rule.name}
                    <small>{rule.code} · {rule.sequence}</small>
                  </label>
                ))}
            </div>
          </>
        )}

        {/* ── Working Schedules ─────────────────────────────────────────────── */}
        {collection === 'schedules' && (
          <>
            {input('name', 'Schedule name')}
            {input('start', 'Shift start', 'time')}
            {input('end', 'Shift end', 'time')}
            {input('breakHours', 'Daily break (hours)', 'number')}
            <div className="field wide check-list">
              <span>Working days</span>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                <label key={d}>
                  <Checkbox
                    checked={r.days.includes(d)}
                    onCheckedChange={(v) =>
                      set('days', v ? [...r.days, d] : r.days.filter((x: string) => x !== d))
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
            <p className="note field wide">
              Weekly hours are calculated from the selected days, shift duration, and daily break.
            </p>
          </>
        )}

        {/* ── System Users ─────────────────────────────────────────────────── */}
        {collection === 'users' && (
          <>
            {input('name', 'Full name')}
            {input('email', 'Work email', 'email')}
            {rolePick()}
            {pick('employeeId', 'Linked employee (optional)', [
              { value: '', label: 'None (System Only)' },
              ...s.employees.map((e) => ({ value: e.id, label: `${e.name} (${e.department})` })),
            ])}
            {input(
              'password',
              initial.id ? 'Password (leave blank to keep unchanged)' : 'Initial password',
              'password',
              !initial.id
            )}
            <label className="check-label">
              <Checkbox checked={r.active ?? true} onCheckedChange={(v) => set('active', v)} />
              Active user account
            </label>
            <p className="note field wide">
              Accounts are created and assigned roles by an Admin only. Assign roles to enforce
              role-based access control.
            </p>
          </>
        )}

      </div>

      <div className="modal-actions">
        {initial.id && onDelete && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="mr-auto text-rose-600"
            onClick={() => {
              const label = collection === 'employees' ? 'archive this employee' : 'delete this record';
              if (window.confirm(`Are you sure you want to ${label}?`)) void onDelete();
            }}
          >
            {collection === 'employees' ? 'Archive employee' : 'Delete'}
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial.id ? 'Save changes' : 'Create record'}</Button>
      </div>
    </form>
  );
}
