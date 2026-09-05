'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, Picker } from './peoplepay-ui';
import { scheduleRows, scheduleWeeklyHours, type Row, type Workspace, WEEKDAYS } from '@/lib/domain';

export const titles: Record<string, string> = {
  employees: 'Employees', contracts: 'Contracts', attendance: 'Attendance', requests: 'Time off requests', allocations: 'Allocations',
  leaveTypes: 'Time off types', rules: 'Salary rules', structures: 'Salary structures', schedules: 'Working schedules', payruns: 'Payruns',
  payslips: 'Payslips', overview: 'Payroll overview', run: 'Payrun', employee: 'Employee profile', users: 'System Users',
};

const defaultWorkRows = () => WEEKDAYS.map((day) => ({ id: day, day, working: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day), start: '09:00', end: '18:00', breakHours: 1 }));

export function defaults(collection: string, s: Workspace, employeeId?: string): Row {
  const employee = employeeId || s.employees[0]?.id || '', structure = s.structures[0]?.id || '', schedule = s.schedules[0]?.id || '';
  const records: Record<string, any> = {
    employees: { name: '', email: '', phone: '', department: 'Engineering', position: '', type: 'Full-time', status: 'Active', manager: 'Sara Khan', location: 'Mumbai', scheduleId: schedule, bank: '' },
    contracts: { employeeId: employee, start: '2026-10-01', end: '', wage: 50000, structureId: structure, scheduleId: schedule, status: 'Running' },
    attendance: { employeeId: employee, date: '2026-09-05', checkIn: '09:00', checkOut: '18:00' },
    requests: { employeeId: employee, typeId: 'paid', start: '2026-09-14', end: '2026-09-14', duration: 1, reason: '', status: 'Pending' },
    allocations: { employeeId: employee, typeId: 'paid', amount: 20, start: '2027-01-01', end: '2027-12-31', status: 'Pending' },
    leaveTypes: { name: '', unit: 'Days', requiresAllocation: true, approvalWorkflow: 'HR Approval', payrollImpact: 'Paid' },
    rules: { name: '', code: '', category: 'Allowance', sequence: 40, method: 'Fixed', base: 'WAGE', value: 0, expression: '' },
    structures: { name: '', ruleIds: [], active: true },
    schedules: { name: '', type: 'Fixed', workRows: defaultWorkRows(), weeklyHours: 40 },
    users: { name: '', email: '', roleId: 'employee', employeeId: '', password: '', active: true },
  };
  return { id: '', ...records[collection] };
}

type Props = { collection: string; initial: Row; s: Workspace; busy: boolean; onSave: (record: Row) => Promise<void>; onDelete?: () => Promise<void>; onCancel: () => void };

export default function RecordForm({ collection, initial, s, busy, onSave, onDelete, onCancel }: Props) {
  const [r, setR] = useState<Row>(() => collection === 'schedules' ? { ...initial, type: initial.type || 'Fixed', workRows: scheduleRows(initial) } : initial);
  const set = (key: string, value: any) => setR((old) => ({ ...old, [key]: value }));
  const input = (key: string, label: string, type = 'text', required = true) => <Field key={key} label={label}><Input aria-label={label} type={type} required={required} value={r[key] ?? ''} onChange={(event) => set(key, event.target.value)} step={type === 'number' ? '0.01' : undefined} min={type === 'number' ? 0 : undefined} /></Field>;
  const pick = (key: string, label: string, options: (string | { value: string; label: string })[]) => <Field key={key} label={label}><Picker label={label} value={r[key] ?? ''} onChange={(value) => set(key, value)} options={options} /></Field>;
  const employeePick = () => pick('employeeId', 'Employee', s.employees.map((item) => ({ value: item.id, label: item.name })));
  const schedulePick = () => pick('scheduleId', 'Working schedule', s.schedules.map((item) => ({ value: item.id, label: item.name })));
  const structurePick = () => pick('structureId', 'Salary structure', s.structures.map((item) => ({ value: item.id, label: item.name })));
  const typePick = () => pick('typeId', 'Time off type', s.leaveTypes.map((item) => ({ value: item.id, label: item.name })));
  const rolePick = () => pick('roleId', 'System Role', [{ value: 'admin', label: 'Admin' }, { value: 'payroll_manager', label: 'HR Payroll Manager' }, { value: 'payroll_user', label: 'HR Payroll User' }, { value: 'hr_manager', label: 'HR Manager' }, { value: 'employee', label: 'Employee' }]);
  const updateScheduleRow = (day: string, values: Record<string, any>) => set('workRows', scheduleRows(r).map((row) => row.day === day ? { ...row, ...values } : row));

  return <form onSubmit={(event) => { event.preventDefault(); void onSave(r); }}>
    <div className="form-grid">
      {collection === 'employees' && <>{input('name', 'Full name')}{input('email', 'Work email', 'email')}{input('position', 'Job position')}{input('department', 'Department')}{pick('type', 'Employee type', ['Full-time', 'Contract', 'Intern'])}{pick('status', 'Status', ['Active', 'Archived'])}{input('manager', 'Manager', 'text', false)}{schedulePick()}{input('location', 'Work location', 'text', false)}{input('phone', 'Phone', 'tel', false)}{input('bank', 'Bank account reference', 'text', false)}</>}
      {collection === 'contracts' && <>{employeePick()}{input('wage', 'Monthly contract wage (INR)', 'number')}{input('start', 'Start date', 'date')}{input('end', 'End date (optional)', 'date', false)}{structurePick()}{schedulePick()}<p className="note field wide">Contract ranges cannot overlap. Payroll currently requires one contract covering the full month.</p></>}
      {collection === 'attendance' && <>{employeePick()}{input('date', 'Date', 'date')}{input('checkIn', 'Check-in', 'time', false)}{input('checkOut', 'Check-out', 'time', false)}<p className="note field wide">Worked hours are calculated from check-in and check-out.</p></>}
      {collection === 'requests' && <>{employeePick()}{typePick()}{input('start', 'Start date', 'date')}{input('end', 'End date', 'date')}{s.leaveTypes.find((item) => item.id === r.typeId)?.unit === 'Hours' && input('duration', 'Requested hours', 'number')}{input('reason', 'Reason')}<p className="note field wide">Day duration follows the employee’s working schedule. Approved unpaid leave is deducted during payroll computation.</p></>}
      {collection === 'allocations' && <>{employeePick()}{typePick()}{input('amount', 'Allocated days / hours', 'number')}{input('start', 'Valid from', 'date')}{input('end', 'Valid until', 'date')}<p className="note field wide">Allocations become available after approval.</p></>}
      {collection === 'leaveTypes' && <>{input('name', 'Type name')}{pick('unit', 'Unit', ['Days', 'Hours'])}{pick('approvalWorkflow', 'Approval workflow', ['No Approval', 'Manager Approval', 'HR Approval'])}{pick('payrollImpact', 'Payroll treatment', ['Paid', 'Unpaid', 'No Payroll Impact'])}<label className="check-label"><Checkbox checked={!!r.requiresAllocation} onCheckedChange={(value) => set('requiresAllocation', !!value)} />Requires an approved allocation</label></>}
      {collection === 'rules' && <>{input('name', 'Rule name')}{input('code', 'Code (uppercase)')}{pick('category', 'Category', ['Basic', 'Allowance', 'Deduction'])}{input('sequence', 'Execution sequence', 'number')}{pick('method', 'Computation', ['Fixed', 'Percentage', 'Formula'])}{r.method !== 'Formula' && input('value', r.method === 'Fixed' ? 'Amount (INR)' : 'Percentage', 'number')}{r.method === 'Percentage' && pick('base', 'Percentage base', [{ value: 'WAGE', label: 'Contract wage' }, ...s.rules.filter((item) => item.id !== r.id && item.sequence < +r.sequence).map((item) => ({ value: item.code, label: `${item.name} (${item.code})` }))])}{r.method === 'Formula' && input('expression', 'Formula (e.g. BASIC * 0.1 + 2000)')}</>}
      {collection === 'structures' && <>{input('name', 'Structure name')}<label className="check-label"><Checkbox checked={!!r.active} onCheckedChange={(value) => set('active', !!value)} />Active</label><div className="field wide check-list"><span>Included salary rules</span>{s.rules.slice().sort((a, b) => a.sequence - b.sequence).map((rule) => <label key={rule.id}><Checkbox checked={r.ruleIds.includes(rule.id)} onCheckedChange={(value) => set('ruleIds', value ? [...r.ruleIds, rule.id] : r.ruleIds.filter((id: string) => id !== rule.id))} />{rule.name}<small>{rule.code} · {rule.sequence}</small></label>)}</div></>}
      {collection === 'schedules' && <>{input('name', 'Schedule name')}{pick('type', 'Schedule type', ['Fixed', 'Flexible', 'Shift'])}<div className="field wide overflow-x-auto"><div className="mb-2 flex justify-between text-xs font-semibold"><span>Weekly working rows</span><span>{scheduleWeeklyHours(r).toFixed(1)} hours/week</span></div><table className="w-full text-xs"><thead><tr className="text-left text-slate-500"><th className="pb-2">Working</th><th>Day</th><th>Start</th><th>End</th><th>Break</th></tr></thead><tbody>{scheduleRows(r).map((row) => <tr key={row.day} className="border-t border-slate-100"><td className="py-2"><Checkbox checked={!!row.working} onCheckedChange={(value) => updateScheduleRow(row.day, { working: !!value })} /></td><td className="font-medium pr-3">{row.day}</td><td className="pr-2"><Input type="time" aria-label={`${row.day} start`} disabled={!row.working} value={row.start} onChange={(event) => updateScheduleRow(row.day, { start: event.target.value })} /></td><td className="pr-2"><Input type="time" aria-label={`${row.day} end`} disabled={!row.working} value={row.end} onChange={(event) => updateScheduleRow(row.day, { end: event.target.value })} /></td><td><Input type="number" min="0" step="0.25" aria-label={`${row.day} break hours`} disabled={!row.working} value={row.breakHours} onChange={(event) => updateScheduleRow(row.day, { breakHours: event.target.value })} /></td></tr>)}</tbody></table></div></>}
      {collection === 'users' && <>{input('name', 'Full name')}{input('email', 'Work email', 'email')}{rolePick()}{pick('employeeId', 'Linked employee (optional)', [{ value: '', label: 'None (System Only)' }, ...s.employees.map((item) => ({ value: item.id, label: `${item.name} (${item.department})` }))])}{input('password', initial.id ? 'Password (leave blank to keep unchanged)' : 'Initial password', 'password', !initial.id)}</>}
    </div>
    <div className="modal-actions">
      {initial.id && onDelete && <Button type="button" variant="outline" disabled={busy} className="mr-auto text-rose-600" onClick={() => { const label = collection === 'employees' ? 'archive this employee' : 'delete this record'; if (window.confirm(`Are you sure you want to ${label}?`)) void onDelete(); }}>{collection === 'employees' ? 'Archive employee' : 'Delete'}</Button>}
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : initial.id ? 'Save changes' : 'Create record'}</Button>
    </div>
  </form>;
}
