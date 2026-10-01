'use client';

import { useMemo, useState } from 'react';
import { Check, Search, UserCog, Users, X } from 'lucide-react';
import { Avatar } from '@/components/peoplepay-ui';
import { Checkbox } from '@/components/ui/checkbox';
import type { Row } from '@/lib/domain';

export type AssignmentManager = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string;
  employeeId?: string;
  active?: boolean;
  department?: string;
  position?: string;
  phone?: string;
  type?: string;
  manager?: string;
  location?: string;
  scheduleId?: string;
  bank?: string;
  assignedEmployeeIds?: string[];
};

type Props = {
  managers: AssignmentManager[];
  employees: Row[];
  busy: boolean;
  onSave: (
    manager: AssignmentManager,
    employeeIds: string[],
  ) => Promise<boolean>;
};

export default function ManagerAssignments({
  managers,
  employees,
  busy,
  onSave,
}: Props) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AssignmentManager | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState('');

  const assignmentOwner = useMemo(() => {
    const owners = new Map<string, AssignmentManager>();
    managers.forEach((manager) =>
      (manager.assignedEmployeeIds || []).forEach((employeeId) =>
        owners.set(employeeId, manager),
      ),
    );
    return owners;
  }, [managers]);

  const visibleManagers = managers.filter((manager) => {
    const needle = query.trim().toLowerCase();
    return (
      !needle ||
      [manager.name, manager.email, manager.department, manager.position].some(
        (value) =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
      )
    );
  });

  const visibleEmployees = employees
    .filter(
      (employee) =>
        employee.status !== 'Archived' && employee.id !== editing?.employeeId,
    )
    .filter((employee) => {
      const needle = employeeQuery.trim().toLowerCase();
      return (
        !needle ||
        [
          employee.name,
          employee.email,
          employee.department,
          employee.position,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(needle),
        )
      );
    });

  const assignedCount = assignmentOwner.size;
  const activeEmployees = employees.filter(
    (employee) => employee.status !== 'Archived',
  ).length;

  function beginEdit(manager: AssignmentManager) {
    setEditing(manager);
    setSelectedIds([...(manager.assignedEmployeeIds || [])]);
    setEmployeeQuery('');
  }

  function toggleEmployee(employeeId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, employeeId])]
        : current.filter((id) => id !== employeeId),
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          [
            'People managers',
            managers.length,
            'HR managers available for assignment',
          ],
          [
            'Assigned employees',
            assignedCount,
            'Employees with a responsible manager',
          ],
          [
            'Unassigned employees',
            Math.max(0, activeEmployees - assignedCount),
            'Employees needing an owner',
          ],
        ].map(([label, value, note]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-2xs"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#e5ded4] bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Manager teams</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Each employee can belong to one HR manager. Reassigning transfers
            ownership.
          </p>
        </div>
        <label className="pill-search w-full border border-[#e5ded4] bg-[#faf8f5] sm:w-72">
          <Search size={14} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search managers…"
          />
        </label>
      </div>

      {visibleManagers.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visibleManagers.map((manager) => {
            const assigned = (manager.assignedEmployeeIds || [])
              .map((id) => employees.find((employee) => employee.id === id))
              .filter(Boolean) as Row[];
            return (
              <section
                key={manager.id}
                className="overflow-hidden rounded-2xl border border-[#e5ded4] bg-white shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#eee8df] bg-[#faf8f5] p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={manager.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">
                          {manager.name}
                        </h3>
                        {!manager.active && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-500">
                        {manager.position || 'HR Manager'} · {manager.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => beginEdit(manager)}
                    className="pill-btn pill-btn-black !py-1.5 text-xs"
                  >
                    <UserCog size={13} /> Edit team
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Direct reports
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {assigned.length} employee
                      {assigned.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {assigned.length ? (
                    <div className="space-y-2">
                      {assigned.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
                        >
                          <Avatar name={employee.name} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">
                              {employee.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                              {employee.position || 'Team Member'} ·{' '}
                              {employee.department || 'Unassigned department'}
                            </p>
                          </div>
                          <Check size={14} className="text-emerald-600" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 py-7 text-center">
                      <Users size={22} className="mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-500">
                        No employees assigned
                      </p>
                      <button
                        type="button"
                        onClick={() => beginEdit(manager)}
                        className="mt-1 text-[11px] font-bold text-amber-700 hover:underline"
                      >
                        Assign employees
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <UserCog size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No managers found</p>
          <p className="mt-1 text-xs text-slate-400">
            Create an HR Manager account from the Users page first.
          </p>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close assignment editor"
            disabled={busy}
            className="absolute inset-0 h-full w-full bg-slate-900/45 backdrop-blur-xs"
            onClick={() => setEditing(null)}
          />
          <div className="relative flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#e5ded4] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#e5ded4] p-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Edit {editing.name}&apos;s team
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedIds.length} employee
                  {selectedIds.length === 1 ? '' : 's'} selected
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(null)}
                className="circle-btn"
              >
                <X size={16} />
              </button>
            </div>
            <div className="border-b border-[#eee8df] bg-[#faf8f5] p-4">
              <label className="pill-search w-full border border-[#e5ded4] bg-white">
                <Search size={14} className="shrink-0 text-slate-400" />
                <input
                  value={employeeQuery}
                  onChange={(event) => setEmployeeQuery(event.target.value)}
                  placeholder="Search employees by name, role, or department…"
                />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {visibleEmployees.map((employee) => {
                  const owner = assignmentOwner.get(employee.id);
                  const checked = selectedIds.includes(employee.id);
                  return (
                    <label
                      key={employee.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${checked ? 'border-amber-300 bg-amber-50/60' : 'border-slate-100 hover:bg-slate-50'}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleEmployee(employee.id, !!value)
                        }
                      />
                      <Avatar name={employee.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {employee.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-400">
                          {employee.position || 'Team Member'} ·{' '}
                          {employee.department || 'Unassigned department'}
                        </p>
                      </div>
                      {owner && owner.id !== editing.id && (
                        <span
                          className="max-w-40 truncate rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700"
                          title={`Currently assigned to ${owner.name}`}
                        >
                          From {owner.name}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[#e5ded4] bg-[#faf8f5] p-4">
              <p className="text-[11px] text-slate-500">
                Selections owned by another manager will be transferred when
                saved.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(null)}
                  className="pill-btn !py-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    if (await onSave(editing, selectedIds)) setEditing(null);
                  }}
                  className="pill-btn pill-btn-black !py-2"
                >
                  {busy ? 'Saving…' : 'Save assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
