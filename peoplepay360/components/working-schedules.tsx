'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Clock,
  Trash2,
  Save,
  ArrowLeft,
  X,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  type Row,
  type Workspace,
  WEEKDAYS,
  scheduleRows,
  scheduleDayHours,
  scheduleWeeklyHours,
} from '@/lib/domain';

export interface WorkingSchedulesProps {
  s: Workspace;
  activeId?: string;
  onNavigate: (view: string, id?: string) => void;
  onSaveSchedule: (record: Row) => Promise<void>;
  onDeleteSchedule?: (id: string) => Promise<void>;
  busy?: boolean;
  query?: string;
  statusFilter?: 'All' | 'Active' | 'Inactive';
  typeFilter?: 'All' | 'Fixed' | 'Flexible' | 'Shift';
}

export default function WorkingSchedules({
  s,
  activeId,
  onNavigate,
  onSaveSchedule,
  onDeleteSchedule,
  busy = false,
  query: propQuery,
  statusFilter: propStatusFilter,
  typeFilter: propTypeFilter,
}: WorkingSchedulesProps) {
  // If activeId is provided ('new' or specific id), display the Form View
  const isFormView = Boolean(activeId);

  // Filter state for List View (use props if provided, fallback to local state)
  const [localQuery, setLocalQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [localTypeFilter, setLocalTypeFilter] = useState<'All' | 'Fixed' | 'Flexible' | 'Shift'>('All');

  const query = propQuery !== undefined ? propQuery : localQuery;
  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const typeFilter = propTypeFilter !== undefined ? propTypeFilter : localTypeFilter;

  // Filtered schedules for List View
  const filteredSchedules = useMemo(() => {
    if (!s?.schedules) return [];
    return s.schedules.filter((sch) => {
      const matchesQuery =
        !query ||
        sch.name.toLowerCase().includes(query.toLowerCase()) ||
        (sch.company || '').toLowerCase().includes(query.toLowerCase()) ||
        (sch.type || '').toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === 'All' || (sch.status || 'Active') === statusFilter;
      const matchesType =
        typeFilter === 'All' || (sch.type || 'Fixed') === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [s?.schedules, query, statusFilter, typeFilter]);

  // Form View state
  const activeRecord = useMemo(() => {
    if (!activeId || activeId === 'new') {
      return {
        id: '',
        name: '',
        company: 'My Company',
        type: 'Fixed',
        status: 'Active',
        timezone: 'Company timezone',
        weeklyHours: 40,
        workRows: [
          { id: 'Monday', day: 'Monday', working: true, start: '09:00', end: '18:00', breakHours: 1 },
          { id: 'Tuesday', day: 'Tuesday', working: true, start: '09:00', end: '18:00', breakHours: 1 },
          { id: 'Wednesday', day: 'Wednesday', working: true, start: '09:00', end: '18:00', breakHours: 1 },
          { id: 'Thursday', day: 'Thursday', working: true, start: '09:00', end: '18:00', breakHours: 1 },
          { id: 'Friday', day: 'Friday', working: true, start: '09:00', end: '18:00', breakHours: 1 },
        ],
      };
    }
    const found = s.schedules.find((x) => x.id === activeId);
    if (!found) return null;
    return {
      ...found,
      company: found.company || 'My Company',
      timezone: found.timezone || 'Company timezone',
      status: found.status || 'Active',
      type: found.type || 'Fixed',
      workRows: scheduleRows(found).filter((r) => r.working),
    };
  }, [activeId, s?.schedules]);

  // Working Schedule Form local state
  const [formData, setFormData] = useState<Row | null>(null);
  const [formError, setFormError] = useState('');

  React.useEffect(() => {
    if (activeRecord) {
      setFormData(structuredClone(activeRecord));
      setFormError('');
    } else {
      setFormData(null);
    }
  }, [activeRecord]);

  // Compute live days per week and weekly hours for form
  const derivedStats = useMemo(() => {
    if (!formData || !formData.workRows) return { daysPerWeek: 0, weeklyHours: 0 };
    const rows = (formData.workRows as Row[]).filter((r) => r.working !== false);
    const totalHours = rows.reduce((acc, r) => acc + scheduleDayHours(r), 0);
    return {
      daysPerWeek: rows.length,
      weeklyHours: Math.round(totalHours * 10) / 10,
    };
  }, [formData]);

  // Form day manipulation handlers
  const handleUpdateRow = (index: number, updates: Partial<Row>) => {
    if (!formData) return;
    const newRows = [...(formData.workRows as Row[])];
    newRows[index] = { ...newRows[index], ...updates };
    setFormData({ ...formData, workRows: newRows });
  };

  const handleAddDay = () => {
    if (!formData) return;
    const currentDays = new Set((formData.workRows as Row[]).map((r) => r.day));
    const nextDay = WEEKDAYS.find((d) => !currentDays.has(d)) || 'Monday';
    const newRow = {
      id: `${nextDay}-${Date.now()}`,
      day: nextDay,
      working: true,
      start: '09:00',
      end: '18:00',
      breakHours: 1,
    };
    setFormData({
      ...formData,
      workRows: [...(formData.workRows as Row[]), newRow],
    });
  };

  const handleRemoveDay = (index: number) => {
    if (!formData) return;
    const newRows = [...(formData.workRows as Row[])];
    newRows.splice(index, 1);
    setFormData({ ...formData, workRows: newRows });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    if (!formData.name.trim()) {
      setFormError('Schedule name is required.');
      return;
    }
    const rows = (formData.workRows as Row[]).filter((r) => r.working !== false);
    if (rows.length === 0) {
      setFormError('At least one working day must be added.');
      return;
    }
    for (const r of rows) {
      if (!r.start || !r.end || r.end <= r.start) {
        setFormError(`Please ensure end time is after start time for ${r.day}.`);
        return;
      }
    }

    const payload: Row = {
      ...formData,
      weeklyHours: derivedStats.weeklyHours,
      days: rows.map((r) => r.day),
      workRows: rows,
    };

    setFormError('');
    await onSaveSchedule(payload);
    onNavigate('schedules');
  };

  const handleDeleteForm = async () => {
    if (!formData || !formData.id || !onDeleteSchedule) return;
    const assignedCount = s.employees.filter((e) => e.scheduleId === formData.id).length;
    if (assignedCount > 0) {
      alert(`Cannot delete schedule: It is currently assigned to ${assignedCount} employee(s).`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${formData.name}"?`)) {
      await onDeleteSchedule(formData.id);
      onNavigate('schedules');
    }
  };

  // ═════════════════════════════════════════════════════════════
  // 1. FORM VIEW (Matches Image 3)
  // ═════════════════════════════════════════════════════════════
  if (isFormView) {
    if (!formData) {
      return (
        <div className="workora-table-container p-8 text-center text-slate-500">
          <p className="text-sm">Schedule not found.</p>
          <button
            className="mt-4 px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            onClick={() => onNavigate('schedules')}
          >
            Back to schedules
          </button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-5xl mx-auto space-y-5 animate-in fade-in duration-200">
        {/* Top bar with back button & actions */}
        <div className="flex items-center justify-between gap-3 bg-white border border-[#e5ded4] rounded-2xl px-6 py-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('schedules')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} /> Back to list
            </button>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {formData.name || (activeId === 'new' ? 'New Working Schedule' : 'Edit Schedule')}
            </h1>
            <span
              className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                formData.status === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {formData.status || 'Active'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('schedules')}
              className="h-8 px-3.5 rounded-xl border border-[#e5ded4] bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {formData.id && onDeleteSchedule && (
              <button
                type="button"
                onClick={handleDeleteForm}
                disabled={busy}
                className="h-8 px-3.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveForm}
              disabled={busy}
              className="h-8 px-4 rounded-xl bg-[#1a1a1a] hover:bg-black text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save size={13} /> {busy ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {formError && (
          <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3.5 rounded-xl">
            <AlertCircle size={15} /> {formError}
          </div>
        )}

        {/* Schedule Profile Fields (Top metadata card) */}
        <div className="bg-white border border-[#e5ded4] rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Schedule Name
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. 40 Hours / Week"
                className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-[#faf8f5] text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Company
              </label>
              <input
                type="text"
                value={formData.company || 'My Company'}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-[#faf8f5] text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Days per Week
                </label>
                <div className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-slate-50 text-xs font-bold text-slate-800 flex items-center">
                  {derivedStats.daysPerWeek} days
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Hours per Week
                </label>
                <div className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-slate-50 text-xs font-extrabold text-amber-700 flex items-center">
                  {derivedStats.weeklyHours}h
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Timezone
              </label>
              <input
                type="text"
                value={formData.timezone || 'Company timezone'}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-[#faf8f5] text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Calendar / Schedule Type
              </label>
              <select
                value={formData.type || 'Fixed'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-[#faf8f5] text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="Fixed">Fixed Schedule</option>
                <option value="Flexible">Flexible Schedule</option>
                <option value="Shift">Shift-Based Schedule</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Status
              </label>
              <select
                value={formData.status || 'Active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 px-3.5 rounded-xl border border-[#e5ded4] bg-[#faf8f5] text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-800"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Weekly Schedule Section (Matching Image 3) */}
        <div className="bg-white border border-[#e5ded4] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#f0ece5]">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-amber-600" />
                Weekly Schedule
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Define the recurring weekly pattern for working hours and breaks.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddDay}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-[#e5ded4] bg-[#faf8f5] hover:bg-[#ebdcc8]/50 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <Plus size={13} /> Add Day
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 font-bold border-b border-slate-100">
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">Start Time</th>
                  <th className="py-2.5 px-3">End Time</th>
                  <th className="py-2.5 px-3">Break</th>
                  <th className="py-2.5 px-3">Daily Hours</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {(formData.workRows as Row[]).map((row, idx) => {
                  const dayHrs = scheduleDayHours(row);
                  return (
                    <tr key={row.id || `${row.day}-${idx}`} className="hover:bg-[#faf8f5]/60 transition-colors">
                      <td className="py-2 px-3 w-40">
                        <select
                          value={row.day}
                          onChange={(e) => handleUpdateRow(idx, { day: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-[#e5ded4] bg-white text-xs font-semibold text-slate-800 focus:outline-none"
                        >
                          {WEEKDAYS.map((dayName) => (
                            <option key={dayName} value={dayName}>
                              {dayName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2 px-3 w-36">
                        <input
                          type="time"
                          value={row.start || '09:00'}
                          onChange={(e) => handleUpdateRow(idx, { start: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-[#e5ded4] bg-white text-xs font-mono text-slate-800 focus:outline-none"
                        />
                      </td>

                      <td className="py-2 px-3 w-36">
                        <input
                          type="time"
                          value={row.end || '18:00'}
                          onChange={(e) => handleUpdateRow(idx, { end: e.target.value })}
                          className="w-full h-8 px-2 rounded-lg border border-[#e5ded4] bg-white text-xs font-mono text-slate-800 focus:outline-none"
                        />
                      </td>

                      <td className="py-2 px-3 w-28">
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="6"
                            value={row.breakHours ?? 1}
                            onChange={(e) => handleUpdateRow(idx, { breakHours: parseFloat(e.target.value) || 0 })}
                            className="w-full h-8 pl-2 pr-6 rounded-lg border border-[#e5ded4] bg-white text-xs font-mono text-slate-800 focus:outline-none"
                          />
                          <span className="absolute right-2 text-[10px] text-slate-400 font-bold">h</span>
                        </div>
                      </td>

                      <td className="py-2 px-3 font-extrabold text-slate-900">
                        {dayHrs}h
                      </td>

                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove day"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Total Line */}
          <div className="pt-3 border-t border-[#f0ece5] flex items-center justify-between">
            <span className="text-xs text-slate-400 italic">
              Use this schedule as the employee/contract working pattern.
            </span>
            <div className="text-xs font-extrabold text-slate-900">
              Total Weekly Hours:{' '}
              <span className="text-base text-amber-600 font-black ml-1.5">
                {derivedStats.weeklyHours}h
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════
  // 2. LIST VIEW (Matches Image 2)
  // ═════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">

      {/* ─── DATA TABLE (Matching Image 2) ─── */}
      <div className="workora-table-container">
        <table className="workora-table">
          <thead>
            <tr>
              <th className="text-left">Schedule Name</th>
              <th className="text-left">Days / Week</th>
              <th className="text-left">Hours / Week</th>
              <th className="text-left">Company</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-xs text-slate-400">
                  No working schedules match your search.
                </td>
              </tr>
            ) : (
              filteredSchedules.map((sch) => {
                const rows = scheduleRows(sch).filter((r) => r.working);
                const daysCount = rows.length;
                const weeklyHrs = scheduleWeeklyHours(sch);
                const isActive = (sch.status || 'Active') === 'Active';

                return (
                  <tr
                    key={sch.id}
                    onClick={() => onNavigate('schedules', sch.id)}
                    className="group cursor-pointer hover:bg-[#faf7f3] transition-colors"
                  >
                    <td className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded-full bg-transparent group-hover:bg-amber-500 transition-colors" />
                        <span className="text-xs">{sch.name}</span>
                      </div>
                    </td>

                    <td className="font-bold text-slate-700 text-xs">
                      {daysCount}
                    </td>

                    <td className="font-extrabold text-slate-900 font-mono text-xs">
                      {weeklyHrs}h
                    </td>

                    <td className="text-slate-600 font-medium text-xs">
                      {sch.company || 'My Company'}
                    </td>

                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {sch.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Bottom helper text matching Image 2 */}
        <div className="p-3 border-t border-[#f0ece5] bg-[#faf8f5]/60 text-[11px] text-slate-400 italic">
          Select a schedule to open its Form view
        </div>
      </div>
    </div>
  );
}
