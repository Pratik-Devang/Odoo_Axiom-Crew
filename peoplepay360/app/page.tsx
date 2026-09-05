'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  ChevronDown,
  ArrowUpRight,
  Clock3,
  LayoutGrid,
  List,
  Download,
  Check,
  RefreshCw,
  FileText,
  Search,
  BadgeCheck,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type Workspace,
  type Row,
  money,
  hours,
  activeContract,
  warnings,
  allocationBalance,
  monthEnd,
} from '@/lib/domain';
import { Avatar, Badge, DataTable, Field, Picker, niceMonth, downloadCsv } from '@/components/peoplepay-ui';
import Dashboard from '@/components/payroll-dashboard';
import RecordForm, { defaults, titles } from '@/components/record-form';
import {
  PageShell,
  MasterList,
  MasterCard,
  DetailPanel,
  DetailSection,
  DetailRow,
  StatBar,
  DocChip,
} from '@/components/page-template';
import { StatusBadge } from '@/components/ui/status-badge';

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EM'
  );
}

type Modal = {
  kind: 'form' | 'request' | 'allocation' | 'wizard' | 'slip' | 'clock' | 'about';
  collection?: string;
  record?: Row;
};

async function readApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const message = text
      .replace(/^Error:\s*/i, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
    throw new Error(message || `The server returned an invalid response (${response.status}).`);
  }
}

export default function Home() {
  const [s, setS] = useState<Workspace | null>(null);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState('overview');
  const [activeId, setActiveId] = useState('');
  const [filterId, setFilterId] = useState('');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [period, setPeriod] = useState('2026-09');
  const [department, setDepartment] = useState('All');
  const [employeeType, setEmployeeType] = useState('All');
  const [modal, setModal] = useState<Modal | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockNow, setClockNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const todayIso = mounted && clockNow ? clockNow.toISOString().slice(0, 10) : '2026-09-05';

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const body = await readApiResponse(r);
      if (!r.ok) throw new Error(body.error || 'Unable to load the workspace.');
      setS(body.data);
      setRevision(body.revision);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void load();
    const timer = setInterval(() => setClockNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const read = () => {
      const [v, id] = window.location.hash.slice(1).split('/');
      if (v && (titles[v] || v === 'overview' || v === 'employee' || v === 'run')) {
        setView(v);
        setActiveId(decodeURIComponent(id || ''));
        setFilterId('');
      }
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  function navigate(v: string, id?: string) {
    setView(v);
    setActiveId(id || '');
    setFilterId('');
    setQuery('');
    setModal(null);
    setError('');
    setMessage('');
    window.history.replaceState(null, '', '#' + v + (id ? '/' + encodeURIComponent(id) : ''));
  }

  function related(v: string, id: string) {
    navigate(v);
    setFilterId(id);
  }

  async function act(
    action: string,
    payload: Record<string, any> = {},
    success = 'Changes saved'
  ): Promise<Workspace | null> {
    if (busy) return null;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, revision }),
      });
      const b = await readApiResponse(r);
      if (!r.ok) throw new Error(b.error || 'Unable to save.');
      setS(b.data);
      setRevision(b.revision);
      setMessage(success);
      return b.data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const employee = (id: string) => s?.employees.find((e) => e.id === id);
  const empName = (id: string) => employee(id)?.name || 'Unknown employee';
  const structure = (id: string) => s?.structures.find((t) => t.id === id)?.name || 'Unknown structure';
  const leaveType = (id: string) => s?.leaveTypes.find((t) => t.id === id);

  function openForm(collection: string, record?: Row) {
    if (!s) return;
    setError('');
    setModal({
      kind: 'form',
      collection,
      record: record ? structuredClone(record) : defaults(collection, s, filterId || undefined),
    });
  }

  const saveRecord = async (record: Row) => {
    const result = await act('save', { collection: modal!.collection, record });
    if (result) setModal(null);
  };

  const filtered = (list: Row[]) =>
    list.filter(
      (r) =>
        (!filterId || r.employeeId === filterId) &&
        (!query ||
          [r.name, r.email, r.department, r.position, r.code, empName(r.employeeId)].some((x) =>
            String(x || '').toLowerCase().includes(query.toLowerCase())
          ))
    );

  const run = s?.payruns.find((r) => r.id === activeId);
  const reviewedRecord =
    modal?.kind === 'request'
      ? s?.requests.find((r) => r.id === modal.record?.id)
      : modal?.kind === 'allocation'
      ? s?.allocations.find((r) => r.id === modal.record?.id)
      : null;

  const currentClock =
    mounted && clockNow && s
      ? s.attendance.find(
          (a) => a.employeeId === 'e6' && a.date === clockNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        )
      : null;
  const signedIn = !!currentClock?.checkIn && !currentClock?.checkOut;
  const allSlips = s?.payruns.flatMap((r) => r.slips.map((p: Row) => ({ ...p, runId: r.id, status: r.status }))) || [];

  const cellEmployee = (r: Row) => (
    <button
      className="flex items-center gap-2 text-left hover:underline cursor-pointer"
      onClick={() => {
        setActiveId(r.employeeId);
        navigate('employees');
      }}
    >
      <Avatar name={empName(r.employeeId)} />
      <span>
        <span className="font-semibold text-slate-900 block leading-tight">{empName(r.employeeId)}</span>
        <span className="text-[11px] text-slate-400 block">{employee(r.employeeId)?.department}</span>
      </span>
    </button>
  );

  const attendanceStatus = (a: Row) =>
    !a.checkIn
      ? 'Absent'
      : !a.checkOut
      ? 'Missing check-out'
      : a.checkIn > (s?.schedules.find((sc) => sc.id === employee(a.employeeId)?.scheduleId)?.start || '09:00')
      ? 'Late'
      : 'Present';

  const runSlipColumns = [
    { title: 'Employee', render: cellEmployee },
    { title: 'Recorded days', render: (p: Row) => p.workedDays },
    { title: 'Basic', render: (p: Row) => money(p.basic) },
    { title: 'Gross', render: (p: Row) => money(p.gross) },
    { title: 'Deductions', render: (p: Row) => money(p.deductions) },
    { title: 'Net salary', render: (p: Row) => <b className="text-slate-900 font-bold">{money(p.net)}</b> },
    {
      title: 'Payslip',
      render: (p: Row) => (
        <button
          className="inline-flex items-center gap-1 text-slate-900 hover:underline font-semibold cursor-pointer"
          onClick={() => setModal({ kind: 'slip', record: p })}
        >
          <FileText size={14} /> View
        </button>
      ),
    },
  ];

  const exportPayroll = () => {
    if (!s) return;
    downloadCsv('peoplepay-payroll.csv', [
      ['Period', 'Employee', 'Department', 'Gross', 'Deductions', 'Net', 'Status'],
      ...allSlips
        .filter((p) => p.period === period)
        .map((p) => [
          p.period,
          empName(p.employeeId),
          employee(p.employeeId)?.department,
          p.gross,
          p.deductions,
          p.net,
          p.status,
        ]),
    ]);
  };

  const departments = s ? [...new Set(s.employees.map((e) => e.department))] : [];

  /* ─────────────────────────────────────────────────────────
     SLOT GENERATORS FOR EACH VIEW (Crextio 3-Column Template)
     ───────────────────────────────────────────────────────── */

  let pageTitle = 'People & Operations Workflow';
  let headerActions: React.ReactNode = null;
  let leftSlot: React.ReactNode = null;
  let centerContent: React.ReactNode = null;
  let rightSlot: React.ReactNode = null;
  let backAction: (() => void) | undefined = undefined;

  if (!s) {
    centerContent = (
      <div className="workora-card text-center py-16">
        <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          {error ? 'Workspace connection unavailable' : 'Opening your workspace…'}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {error
            ? 'Verify that the database is running, then reload.'
            : 'Loading employees, attendance, and payroll records.'}
        </p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={() => void load()}>
          Reload
        </Button>
      </div>
    );
  } else if (view === 'overview') {
    pageTitle = 'People & Operations Workflow';
    headerActions = (
      <>
        <Input
          type="month"
          aria-label="Payroll period"
          className="h-9 px-3 rounded-full bg-white border border-[#e5ded4] text-xs font-medium text-slate-700 w-36 shadow-2xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button
          className="pill-btn pill-btn-black"
          onClick={() => {
            setError('');
            setModal({ kind: 'wizard' });
          }}
        >
          <Plus size={14} />
          New Payrun
          <ChevronDown size={13} className="ml-1 opacity-70" />
        </button>
      </>
    );
    // Dashboard itself implements the full 3-column Crextio layout
    centerContent = (
      <Dashboard
        s={s}
        period={period}
        setPeriod={setPeriod}
        department={department}
        setDepartment={setDepartment}
        employeeType={employeeType}
        setEmployeeType={setEmployeeType}
        navigate={(v, id) => (id && v === 'employees' ? navigate('employee', id) : navigate(v, id))}
      />
    );
  } else if (view === 'employees' || view === 'employee') {
    const activeEmp = employee(activeId) || s.employees[0];
    pageTitle = view === 'employee' ? activeEmp?.name || 'Employee Profile' : 'Team Directory';
    if (view === 'employee') {
      backAction = () => navigate('employees');
    }

    headerActions = (
      <>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className={
              'px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (mode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => setMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            className={
              'px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (mode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => setMode('list')}
            title="List view"
          >
            <List size={13} />
          </button>
        </div>
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button className="pill-btn pill-btn-black" onClick={() => openForm('employees')}>
          <Plus size={14} />
          New Employee
        </button>
      </>
    );

    const filteredEmployees = s.employees.filter(
      (e) =>
        (department === 'All' || e.department === department) &&
        (employeeType === 'All' || e.type === employeeType) &&
        (!query ||
          [e.name, e.department, e.position, e.email].some((x) =>
            x.toLowerCase().includes(query.toLowerCase())
          ))
    );

    // LEFT COLUMN: Master Employee Roster
    leftSlot = (
      <MasterList
        title="Employees"
        count={filteredEmployees.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search employee…"
        filters={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Picker label="Dept" value={department} onChange={setDepartment} options={['All', ...departments]} />
            <Picker
              label="Type"
              value={employeeType}
              onChange={setEmployeeType}
              options={['All', 'Full-time', 'Part-time', 'Intern', 'Contract']}
            />
          </div>
        }
        isEmpty={filteredEmployees.length === 0}
      >
        {filteredEmployees.map((e) => {
          const isSel = e.id === activeEmp?.id;
          const att = s.attendance.filter((a) => a.employeeId === e.id && a.date.startsWith(period));
          const attRate = att.length ? Math.round((att.filter((a) => a.checkIn).length / att.length) * 100) : 0;
          return (
            <MasterCard
              key={e.id}
              avatar={initials(e.name)}
              title={e.name}
              subtitle={`${e.department} · ${e.type}`}
              badge={e.status}
              active={isSel}
              onClick={() => setActiveId(e.id)}
              progress={{
                label: 'Attendance Rate',
                value: attRate,
                displayValue: `${attRate}%`,
                variant: attRate >= 80 ? 'gold' : 'dark',
              }}
            />
          );
        })}
      </MasterList>
    );

    // CENTER COLUMN: Directory Grid or Data Table
    centerContent = (
      <div className="workora-table-container">
        <div className="table-tab-strip flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="table-tab-item active">All Employees ({filteredEmployees.length})</button>
            <button className="table-tab-muted" onClick={() => navigate('contracts')}>
              Contracts
            </button>
            <button className="table-tab-muted" onClick={() => navigate('attendance')}>
              Shifts
            </button>
          </div>
        </div>

        {mode === 'grid' ? (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEmployees.map((e) => {
              const isSelected = e.id === activeEmp?.id;
              return (
                <button
                  key={e.id}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#1a1a1a] bg-white shadow-md ring-1 ring-[#1a1a1a]'
                      : 'border-[#e5ded4] bg-[#fcfbf9] hover:bg-white hover:border-[#cbd2db] hover:shadow-xs'
                  }`}
                  onClick={() => setActiveId(e.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="emp-avatar-lg">{initials(e.name)}</div>
                    <StatusBadge value={e.status} size="sm" />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{e.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{e.position}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{e.email}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#f0ebe3] flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[#f0ebe3] font-medium text-[11px] text-[#5a5047]">
                      {e.department}
                    </span>
                    <span className="text-slate-400 text-[11px]">{e.type}</span>
                  </div>
                </button>
              );
            })}
            {!filteredEmployees.length && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400">
                No employees match your search.
              </div>
            )}
          </div>
        ) : (
          <DataTable
            rows={filteredEmployees}
            columns={[
              {
                title: 'Employee',
                render: (e) => (
                  <button
                    className="flex items-center gap-2 text-left font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => setActiveId(e.id)}
                  >
                    <Avatar name={e.name} />
                    {e.name}
                  </button>
                ),
              },
              { title: 'Work email', render: (e) => e.email },
              { title: 'Job position', render: (e) => e.position },
              { title: 'Department', render: (e) => e.department },
              { title: 'Status', render: (e) => <Badge value={e.status} /> },
            ]}
          />
        )}
      </div>
    );

    // RIGHT COLUMN: Selected Employee Contextual Detail Panel
    if (activeEmp) {
      const contract = s.contracts
        .filter((c) => c.employeeId === activeEmp.id)
        .sort((a, b) => b.start.localeCompare(a.start))[0];
      const sched = s.schedules.find((sc) => sc.id === activeEmp.scheduleId);
      const att = s.attendance.filter((a) => a.employeeId === activeEmp.id && a.date.startsWith(period));
      const attRate = att.length ? Math.round((att.filter((a) => a.checkIn).length / att.length) * 100) : 0;
      const allocs = s.allocations.filter((a) => a.employeeId === activeEmp.id);
      const leaveDays = allocs.reduce((n, a) => n + (a.status === 'Approved' ? a.amount : 0), 0);

      rightSlot = (
        <DetailPanel
          avatar={initials(activeEmp.name)}
          title={activeEmp.name}
          subtitle={`${activeEmp.position} · ${activeEmp.department}`}
          badge={activeEmp.status}
        >
          <DetailSection title="BASIC INFORMATION">
            <DetailRow label="Department" value={activeEmp.department} />
            <DetailRow label="Manager" value={activeEmp.manager || 'Leadership'} />
            <DetailRow label="Work Schedule" value={sched?.name || 'Standard 40h'} />
            <DetailRow label="Location" value={activeEmp.location || 'Headquarters'} />
            <DetailRow label="Employee Type" value={activeEmp.type} />
            <DetailRow label="Bank Reference" value={activeEmp.bank || 'Missing bank detail'} />
          </DetailSection>

          <DetailSection title="DOCUMENTS & CONTRACTS">
            {contract ? (
              <DocChip
                name={`Terms: ${money(contract.wage)} /mo`}
                meta={`Since ${contract.start}`}
                onClick={() => related('contracts', activeEmp.id)}
              />
            ) : (
              <DocChip
                name="Create employment contract"
                meta="Draft"
                onClick={() => openForm('contracts', defaults('contracts', s, activeEmp.id))}
              />
            )}
            <DocChip
              name={`${sched?.name || 'Standard Shift'} Policy`}
              meta={`${sched?.start || '09:00'} – ${sched?.end || '18:00'}`}
              onClick={() => navigate('schedules')}
            />
          </DetailSection>

          <DetailSection title="STATISTICS">
            <StatBar
              label="Shift Attendance Rate"
              value={attRate}
              displayValue={`${attRate}%`}
              variant={attRate >= 80 ? 'gold' : 'dark'}
            />
            <StatBar
              label="Approved Leave Pool"
              value={Math.min(leaveDays * 5, 100)}
              displayValue={`${leaveDays} days`}
              variant="green"
            />
          </DetailSection>

          <DetailSection title="QUICK ACTIONS">
            <div className="flex flex-col gap-2">
              <button
                className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                onClick={() => openForm('employees', activeEmp)}
              >
                <BadgeCheck className="size-3.5 text-[#c99a2e]" />
                <span className="doc-chip-name">Edit Employee Profile</span>
              </button>
              <button
                className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                onClick={() => related('contracts', activeEmp.id)}
              >
                <FileText className="size-3.5 text-slate-500" />
                <span className="doc-chip-name">View Contract Terms</span>
              </button>
              <button
                className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
                onClick={() => related('requests', activeEmp.id)}
              >
                <CalendarDays className="size-3.5 text-slate-500" />
                <span className="doc-chip-name">Time Off Requests</span>
              </button>
            </div>
          </DetailSection>
        </DetailPanel>
      );
    }
  } else if (view === 'contracts' || view === 'schedules') {
    pageTitle = view === 'schedules' ? 'Working Schedules' : 'Employment Contracts';
    headerActions = (
      <>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'contracts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('contracts')}
          >
            Contracts
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'schedules' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('schedules')}
          >
            Schedules
          </button>
        </div>
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button className="pill-btn pill-btn-black" onClick={() => openForm(view)}>
          <Plus size={14} />
          {view === 'schedules' ? 'New Schedule' : 'New Contract'}
        </button>
      </>
    );

    const filteredContracts = filtered(s.contracts);
    const activeContractRecord = s.contracts.find((c) => c.id === activeId) || filteredContracts[0];

    leftSlot = (
      <MasterList
        title="Contracts"
        count={filteredContracts.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search contracts…"
        isEmpty={filteredContracts.length === 0}
      >
        {filteredContracts.map((c) => {
          const emp = employee(c.employeeId);
          const isSel = c.id === activeContractRecord?.id;
          const isRunning = !c.end || c.end >= todayIso;
          return (
            <MasterCard
              key={c.id}
              avatar={initials(emp?.name || 'CT')}
              title={emp?.name || 'Contract'}
              subtitle={
                c.id.startsWith('c') && c.id.length < 5
                  ? `CON/2026/${String(+c.id.slice(1) + 1).padStart(4, '0')}`
                  : c.id.slice(0, 8).toUpperCase()
              }
              badge={isRunning ? 'Running' : 'Expired'}
              active={isSel}
              onClick={() => setActiveId(c.id)}
              progress={{
                label: 'Monthly Wage',
                value: 100,
                displayValue: money(c.wage),
                variant: 'gold',
              }}
            />
          );
        })}
      </MasterList>
    );

    centerContent = (
      <div className="workora-table-container">
        <div className="table-tab-strip">
          <button className="table-tab-item active">{titles[view]} ({s[view as keyof Workspace].length})</button>
        </div>
        {view === 'contracts' ? (
          <DataTable
            rows={filteredContracts}
            columns={[
              {
                title: 'Contract',
                render: (c) => (
                  <button
                    className="font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => setActiveId(c.id)}
                  >
                    {c.id.startsWith('c') && c.id.length < 5
                      ? 'CON/2026/' + String(+c.id.slice(1) + 1).padStart(4, '0')
                      : c.id.slice(0, 8).toUpperCase()}
                  </button>
                ),
              },
              { title: 'Employee', render: cellEmployee },
              { title: 'Start date', render: (c) => c.start },
              { title: 'End date', render: (c) => c.end || 'Open-ended' },
              { title: 'Monthly wage', render: (c) => money(c.wage) },
              { title: 'Structure', render: (c) => structure(c.structureId) },
              {
                title: 'Status',
                render: (c) => (
                  <Badge
                    value={
                      c.end && c.end < todayIso
                        ? 'Expired'
                        : c.start > todayIso
                        ? 'Upcoming'
                        : 'Running'
                    }
                  />
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            rows={filtered(s.schedules)}
            columns={[
              {
                title: 'Schedule',
                render: (r) => (
                  <button
                    className="font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => openForm('schedules', r)}
                  >
                    {r.name}
                  </button>
                ),
              },
              { title: 'Working days', render: (r) => r.days.map((d: string) => d.slice(0, 3)).join(', ') },
              { title: 'Hours', render: (r) => r.start + ' – ' + r.end },
              { title: 'Daily break', render: (r) => r.breakHours + ' hr' },
              {
                title: 'Weekly hours',
                render: (r) =>
                  ((hours({ id: r.id, checkIn: r.start, checkOut: r.end }) - r.breakHours) * r.days.length).toFixed(1),
              },
            ]}
          />
        )}
      </div>
    );

    if (activeContractRecord) {
      const emp = employee(activeContractRecord.employeeId);
      const isRunning = !activeContractRecord.end || activeContractRecord.end >= todayIso;
      rightSlot = (
        <DetailPanel
          avatar={initials(emp?.name || 'CT')}
          title={emp?.name || 'Contract Terms'}
          subtitle={`Ref: ${activeContractRecord.id.toUpperCase()}`}
          badge={isRunning ? 'Running' : 'Expired'}
        >
          <DetailSection title="COMPENSATION & TERMS">
            <DetailRow label="Monthly Wage" value={money(activeContractRecord.wage)} />
            <DetailRow label="Salary Structure" value={structure(activeContractRecord.structureId)} />
            <DetailRow label="Start Date" value={activeContractRecord.start} />
            <DetailRow label="End Date" value={activeContractRecord.end || 'Open-ended contract'} />
            <DetailRow label="Employee Department" value={emp?.department || '—'} />
          </DetailSection>

          <DetailSection title="DOCUMENTS">
            <DocChip name="Master Employment Agreement" meta="PDF Document" onClick={() => {}} />
            <DocChip name="Salary Blueprint Schedule" meta={structure(activeContractRecord.structureId)} />
          </DetailSection>

          <DetailSection title="QUICK ACTIONS">
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() => openForm('contracts', activeContractRecord)}
            >
              <BadgeCheck className="size-3.5 text-[#c99a2e]" />
              <span className="doc-chip-name">Edit Contract Terms</span>
            </button>
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() => {
                setActiveId(activeContractRecord.employeeId);
                navigate('employees');
              }}
            >
              <FileText className="size-3.5 text-slate-500" />
              <span className="doc-chip-name">Open Employee Record</span>
            </button>
          </DetailSection>
        </DetailPanel>
      );
    }
  } else if (view === 'attendance') {
    pageTitle = 'Attendance & Shifts';
    headerActions = (
      <>
        <Input
          type="month"
          aria-label="Attendance period"
          className="h-9 px-3 rounded-full bg-white border border-[#e5ded4] text-xs font-medium text-slate-700 w-36 shadow-2xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button className="pill-btn pill-btn-black" onClick={() => openForm('attendance')}>
          <Plus size={14} />
          New Entry
        </button>
      </>
    );

    const activeEmp = employee(activeId) || s.employees[0];
    const filteredAttendance = filtered(s.attendance)
      .filter((a) => !period || a.date.startsWith(period))
      .sort((a, b) => b.date.localeCompare(a.date));

    leftSlot = (
      <MasterList
        title="Staff Attendance"
        count={s.employees.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Filter team…"
      >
        {s.employees.map((e) => {
          const att = s.attendance.filter((a) => a.employeeId === e.id && a.date.startsWith(period));
          const presentCount = att.filter((a) => a.checkIn).length;
          const rate = att.length ? Math.round((presentCount / att.length) * 100) : 0;
          const isSel = e.id === activeEmp?.id;
          return (
            <MasterCard
              key={e.id}
              avatar={initials(e.name)}
              title={e.name}
              subtitle={e.department}
              badge={rate >= 80 ? 'Present' : rate > 0 ? 'Late' : 'Absent'}
              active={isSel}
              onClick={() => setActiveId(e.id)}
              progress={{
                label: 'Attendance Rate',
                value: rate,
                displayValue: `${rate}%`,
                variant: rate >= 80 ? 'gold' : 'dark',
              }}
            />
          );
        })}
      </MasterList>
    );

    centerContent = (
      <div className="workora-table-container">
        <div className="table-tab-strip flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button className="table-tab-item active">Shift Records ({filteredAttendance.length})</button>
          </div>
        </div>
        <DataTable
          rows={filteredAttendance}
          columns={[
            { title: 'Employee', render: cellEmployee },
            {
              title: 'Date',
              render: (a) => (
                <button
                  className="font-semibold text-slate-900 hover:underline cursor-pointer"
                  onClick={() => openForm('attendance', a)}
                >
                  {a.date}
                </button>
              ),
            },
            { title: 'Check-in', render: (a) => a.checkIn || '—' },
            { title: 'Check-out', render: (a) => a.checkOut || '—' },
            { title: 'Worked hours', render: (a) => hours(a).toFixed(2) },
            { title: 'Status', render: (a) => <Badge value={attendanceStatus(a)} /> },
            { title: 'Source', render: (a) => (a.edited ? 'Manually edited' : 'Shift entry') },
          ]}
        />
      </div>
    );

    if (activeEmp) {
      const att = s.attendance.filter((a) => a.employeeId === activeEmp.id && a.date.startsWith(period));
      const present = att.filter((a) => a.checkIn).length;
      const complete = att.filter((a) => a.checkOut).length;
      const missing = present - complete;
      const rate = att.length ? Math.round((present / att.length) * 100) : 0;
      const sched = s.schedules.find((sc) => sc.id === activeEmp.scheduleId);

      rightSlot = (
        <DetailPanel
          avatar={initials(activeEmp.name)}
          title={activeEmp.name}
          subtitle={`Schedule: ${sched?.name || 'Standard 40h'}`}
          badge={rate >= 80 ? 'Present' : 'Irregular'}
        >
          <DetailSection title="ATTENDANCE SUMMARY">
            <DetailRow label="Recorded Days" value={`${att.length} shifts`} />
            <DetailRow label="Completed Check-outs" value={`${complete} of ${present}`} />
            <DetailRow label="Missing Check-outs" value={`${missing} days`} />
            <DetailRow label="Expected Start" value={sched?.start || '09:00'} />
          </DetailSection>

          <DetailSection title="STATISTICS">
            <StatBar
              label="Monthly Present Rate"
              value={rate}
              displayValue={`${rate}%`}
              variant={rate >= 80 ? 'gold' : 'dark'}
            />
          </DetailSection>

          <DetailSection title="QUICK ACTIONS">
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() => openForm('attendance', { ...defaults('attendance', s, activeEmp.id), date: todayIso })}
            >
              <Clock3 className="size-3.5 text-[#c99a2e]" />
              <span className="doc-chip-name">Add Attendance Punch</span>
            </button>
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() => related('requests', activeEmp.id)}
            >
              <CalendarDays className="size-3.5 text-slate-500" />
              <span className="doc-chip-name">Review Leave Balance</span>
            </button>
          </DetailSection>
        </DetailPanel>
      );
    }
  } else if (['requests', 'allocations', 'leaveTypes'].includes(view)) {
    pageTitle = 'Time Off & Leave Management';
    headerActions = (
      <>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'requests' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('requests')}
          >
            Requests
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'allocations' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('allocations')}
          >
            Allocations
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'leaveTypes' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('leaveTypes')}
          >
            Policies
          </button>
        </div>
        <button className="pill-btn pill-btn-black" onClick={() => openForm(view)}>
          <Plus size={14} />
          {view === 'requests' ? 'New Request' : view === 'allocations' ? 'New Allocation' : 'New Policy'}
        </button>
      </>
    );

    const filteredRequests = filtered(s.requests);
    const activeReq = s.requests.find((r) => r.id === activeId) || filteredRequests[0];

    leftSlot = (
      <MasterList
        title="Leave Requests"
        count={filteredRequests.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Filter requests…"
        isEmpty={filteredRequests.length === 0}
      >
        {filteredRequests.map((r) => {
          const emp = employee(r.employeeId);
          const isSel = r.id === activeReq?.id;
          return (
            <MasterCard
              key={r.id}
              avatar={initials(emp?.name || 'TO')}
              title={emp?.name || 'Employee'}
              subtitle={`${leaveType(r.typeId)?.name} · ${r.duration}d`}
              badge={r.status}
              active={isSel}
              onClick={() => setActiveId(r.id)}
              progress={{
                label: 'Duration',
                value: Math.min(r.duration * 10, 100),
                displayValue: `${r.duration} days`,
                variant: r.status === 'Approved' ? 'green' : 'gold',
              }}
            />
          );
        })}
      </MasterList>
    );

    centerContent = (
      <div className="workora-table-container">
        <div className="table-tab-strip">
          <button className="table-tab-item active">{titles[view]} ({s[view as keyof Workspace].length})</button>
        </div>
        {view === 'requests' ? (
          <DataTable
            rows={filteredRequests}
            columns={[
              { title: 'Employee', render: cellEmployee },
              {
                title: 'Time off type',
                render: (r) => (
                  <button
                    className="font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => {
                      setError('');
                      setModal({ kind: 'request', record: r });
                    }}
                  >
                    {leaveType(r.typeId)?.name}
                  </button>
                ),
              },
              { title: 'Dates', render: (r) => r.start + ' – ' + r.end },
              { title: 'Duration', render: (r) => r.duration + ' ' + leaveType(r.typeId)?.unit.toLowerCase() },
              { title: 'Status', render: (r) => <Badge value={r.status} /> },
              {
                title: 'Review',
                render: (r) => (
                  <button
                    className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => {
                      setError('');
                      setModal({ kind: 'request', record: r });
                    }}
                  >
                    Review <ArrowUpRight size={13} />
                  </button>
                ),
              },
            ]}
          />
        ) : view === 'allocations' ? (
          <DataTable
            rows={filtered(s.allocations)}
            columns={[
              { title: 'Employee', render: cellEmployee },
              {
                title: 'Type',
                render: (r) => (
                  <button
                    className="font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => setModal({ kind: 'allocation', record: r })}
                  >
                    {leaveType(r.typeId)?.name}
                  </button>
                ),
              },
              { title: 'Allocated', render: (r) => r.amount + ' ' + leaveType(r.typeId)?.unit.toLowerCase() },
              {
                title: 'Taken',
                render: (r) => (r.status === 'Approved' ? r.amount - allocationBalance(s, r) : 0),
              },
              { title: 'Remaining', render: (r) => allocationBalance(s, r) },
              { title: 'Validity', render: (r) => r.start + ' – ' + r.end },
              { title: 'Status', render: (r) => <Badge value={r.status} /> },
            ]}
          />
        ) : (
          <DataTable
            rows={filtered(s.leaveTypes)}
            columns={[
              {
                title: 'Type',
                render: (r) => (
                  <button
                    className="font-semibold text-slate-900 hover:underline cursor-pointer"
                    onClick={() => openForm('leaveTypes', r)}
                  >
                    {r.name}
                  </button>
                ),
              },
              { title: 'Unit', render: (r) => r.unit },
              { title: 'Allocation', render: (r) => (r.requiresAllocation ? 'Required' : 'Not required') },
              { title: 'Approval', render: () => 'HR approval' },
              { title: 'Status', render: () => <Badge value="Active" /> },
            ]}
          />
        )}
      </div>
    );

    if (activeReq) {
      const emp = employee(activeReq.employeeId);
      rightSlot = (
        <DetailPanel
          avatar={initials(emp?.name || 'TO')}
          title={emp?.name || 'Time Off Request'}
          subtitle={leaveType(activeReq.typeId)?.name || 'Leave Request'}
          badge={activeReq.status}
        >
          <DetailSection title="REQUEST DETAILS">
            <DetailRow label="Time Off Type" value={leaveType(activeReq.typeId)?.name} />
            <DetailRow label="Duration" value={`${activeReq.duration} days`} />
            <DetailRow label="Start Date" value={activeReq.start} />
            <DetailRow label="End Date" value={activeReq.end} />
            <DetailRow label="Approver" value={activeReq.approver || 'Awaiting HR Action'} />
          </DetailSection>

          {activeReq.reason && (
            <DetailSection title="REASON">
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                {activeReq.reason}
              </p>
            </DetailSection>
          )}

          <DetailSection title="QUICK ACTIONS">
            {activeReq.status === 'Pending' ? (
              <div className="flex flex-col gap-2">
                <button
                  className="pill-btn pill-btn-black w-full justify-center !py-2 cursor-pointer"
                  disabled={busy}
                  onClick={() => void act('approveLeave', { id: activeReq.id }, 'Request approved.')}
                >
                  <CheckCircle2 size={14} /> Approve Request
                </button>
                <button
                  className="pill-btn w-full justify-center !py-2 text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                  disabled={busy}
                  onClick={() => void act('refuseLeave', { id: activeReq.id }, 'Request refused.')}
                >
                  <XCircle size={14} /> Refuse
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-500 border border-slate-100 text-center">
                This request has been finalized ({activeReq.status}).
              </div>
            )}
          </DetailSection>
        </DetailPanel>
      );
    }
  } else if (['payruns', 'run', 'payslips', 'structures', 'rules'].includes(view)) {
    pageTitle = view === 'run' ? run?.name || 'Payrun Workflow' : 'Payroll Management';
    if (view === 'run') {
      backAction = () => navigate('payruns');
    }

    headerActions = (
      <>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'payruns' || view === 'run' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('payruns')}
          >
            Payruns
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'payslips' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('payslips')}
          >
            Payslips
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'structures' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('structures')}
          >
            Structures
          </button>
          <button
            className={
              'px-3 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (view === 'rules' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => navigate('rules')}
          >
            Rules
          </button>
        </div>
        <Input
          type="month"
          aria-label="Payroll period"
          className="h-9 px-3 rounded-full bg-white border border-[#e5ded4] text-xs font-medium text-slate-700 w-36 shadow-2xs"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button
          className="pill-btn pill-btn-black"
          onClick={() => {
            setError('');
            setModal({ kind: 'wizard' });
          }}
        >
          <Plus size={14} />
          New Payrun
        </button>
      </>
    );

    const activeRun = s.payruns.find((r) => r.id === activeId) || s.payruns[0];

    leftSlot = (
      <MasterList
        title="Payruns"
        count={s.payruns.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search payruns…"
      >
        {s.payruns.map((r) => {
          const isSel = r.id === activeRun?.id;
          const totalNet = r.slips.reduce((n: number, p: Row) => n + p.net, 0);
          return (
            <MasterCard
              key={r.id}
              avatar="PR"
              title={r.name}
              subtitle={`${niceMonth(r.period)} · ${r.employeeIds.length} staff`}
              badge={r.status}
              active={isSel}
              onClick={() => {
                setActiveId(r.id);
                if (view === 'run') navigate('run', r.id);
              }}
              progress={{
                label: 'Total Net Salary',
                value: 100,
                displayValue: money(totalNet),
                variant: r.status === 'Paid' ? 'green' : 'gold',
              }}
            />
          );
        })}
      </MasterList>
    );

    if (view === 'run' && run) {
      centerContent = (
        <div className="space-y-4">
          <div className="workora-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{run.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Disbursement workflow for {run.period}</p>
              </div>
              <Badge value={run.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400">Period</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {run.period + '-01'} — {monthEnd(run.period)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400">Salary Structure</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{structure(run.structureId)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400">Employees</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">{run.employeeIds.length} Staff</span>
              </div>
              <div className="p-3 rounded-xl bg-[#1a1a1a] text-white">
                <span className="text-[11px] text-slate-400">Total Net Salary</span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {money(run.slips.reduce((n: number, p: Row) => n + p.net, 0))}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
                disabled={busy || !['Draft', 'Computed'].includes(run.status)}
                onClick={() => void act('compute', { id: run.id }, 'Payslips computed.')}
              >
                <RefreshCw size={13} /> Compute Slips
              </button>
              <button
                className="pill-btn !py-1.5 cursor-pointer"
                disabled={busy || run.status !== 'Computed'}
                onClick={() => void act('validate', { id: run.id }, 'Payrun validated.')}
              >
                <Check size={13} /> Validate Run
              </button>
              <button
                className="pill-btn !py-1.5 cursor-pointer"
                disabled={busy || run.status !== 'Validated'}
                onClick={() => void act('markPaid', { id: run.id }, 'Payrun marked paid.')}
              >
                Mark Paid
              </button>
              <button
                className="pill-btn !py-1.5 cursor-pointer"
                disabled={!run.slips.length}
                onClick={() =>
                  downloadCsv('payslips-' + run.period + '.csv', [
                    ['Employee', 'Period', 'Basic', 'Gross', 'Deductions', 'Net'],
                    ...run.slips.map((p: Row) => [
                      empName(p.employeeId),
                      p.period,
                      p.basic,
                      p.gross,
                      p.deductions,
                      p.net,
                    ]),
                  ])
                }
              >
                <Download size={13} /> Export Payslips
              </button>
            </div>
          </div>

          <div className="workora-table-container">
            <div className="table-tab-strip">
              <button className="table-tab-item active">Generated Payslips ({run.slips.length})</button>
            </div>
            <DataTable
              rows={run.slips}
              columns={runSlipColumns}
              empty="Click Compute to generate payslips from contracts and rules."
            />
          </div>
        </div>
      );
    } else {
      centerContent = (
        <div className="workora-table-container">
          <div className="table-tab-strip">
            <button className="table-tab-item active">{titles[view] || 'Payroll'}</button>
          </div>
          {view === 'payruns' && (
            <DataTable
              rows={filtered(s.payruns).filter((r) => !period || r.period === period).slice().reverse()}
              columns={[
                {
                  title: 'Payrun',
                  render: (r) => (
                    <button
                      className="font-semibold text-slate-900 hover:underline flex items-center gap-1 cursor-pointer"
                      onClick={() => navigate('run', r.id)}
                    >
                      {r.name}
                      <ArrowUpRight size={13} />
                    </button>
                  ),
                },
                { title: 'Period', render: (r) => r.period + '-01 – ' + monthEnd(r.period) },
                { title: 'Structure', render: (r) => structure(r.structureId) },
                { title: 'Employees', render: (r) => r.employeeIds.length },
                { title: 'Net salary', render: (r) => money(r.slips.reduce((n: number, p: Row) => n + p.net, 0)) },
                { title: 'Status', render: (r) => <Badge value={r.status} /> },
                { title: 'Warnings', render: (r) => (r.status === 'Paid' ? 'Finalized' : warnings(s, r).length || 'None') },
              ]}
            />
          )}

          {view === 'payslips' && (
            <DataTable
              rows={filtered(allSlips).filter((p) => !period || p.period === period)}
              columns={[
                { title: 'Period', render: (p) => niceMonth(p.period) },
                ...runSlipColumns.slice(0, -1),
                { title: 'Status', render: (p) => <Badge value={p.status} /> },
                runSlipColumns.at(-1)!,
              ]}
            />
          )}

          {view === 'structures' && (
            <DataTable
              rows={filtered(s.structures)}
              columns={[
                {
                  title: 'Structure name',
                  render: (r) => (
                    <button
                      className="font-semibold text-slate-900 hover:underline cursor-pointer"
                      onClick={() => openForm('structures', r)}
                    >
                      {r.name}
                    </button>
                  ),
                },
                { title: 'Rules', render: (r) => r.ruleIds.length + ' rules' },
                {
                  title: 'Employees',
                  render: (r) =>
                    new Set(
                      s.contracts
                        .filter((c) => c.structureId === r.id && c.start <= monthEnd(period) && (!c.end || c.end >= period + '-01'))
                        .map((c) => c.employeeId)
                    ).size,
                },
                { title: 'Status', render: (r) => <Badge value={r.active ? 'Active' : 'Archived'} /> },
              ]}
            />
          )}

          {view === 'rules' && (
            <DataTable
              rows={filtered(s.rules).sort((a, b) => a.sequence - b.sequence)}
              columns={[
                {
                  title: 'Rule name',
                  render: (r) => (
                    <button
                      className="font-semibold text-slate-900 hover:underline cursor-pointer"
                      onClick={() => openForm('rules', r)}
                    >
                      {r.name}
                    </button>
                  ),
                },
                {
                  title: 'Code',
                  render: (r) => (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
                      {r.code}
                    </span>
                  ),
                },
                { title: 'Category', render: (r) => r.category },
                { title: 'Sequence', render: (r) => r.sequence },
                { title: 'Method', render: (r) => r.method },
                {
                  title: 'Calculation',
                  render: (r) =>
                    r.method === 'Formula'
                      ? r.expression
                      : r.method === 'Percentage'
                      ? r.value + '% × ' + r.base
                      : money(r.value),
                },
              ]}
            />
          )}
        </div>
      );
    }

    if (activeRun) {
      const net = activeRun.slips.reduce((n: number, p: Row) => n + p.net, 0);
      const gross = activeRun.slips.reduce((n: number, p: Row) => n + p.gross, 0);
      const deduct = activeRun.slips.reduce((n: number, p: Row) => n + p.deductions, 0);

      rightSlot = (
        <DetailPanel
          avatar="PR"
          title={activeRun.name}
          subtitle={`Period: ${activeRun.period}`}
          badge={activeRun.status}
        >
          <DetailSection title="FINANCIAL SUMMARY">
            <DetailRow label="Net Salary" value={<b>{money(net)}</b>} />
            <DetailRow label="Gross Salary" value={money(gross)} />
            <DetailRow label="Total Deductions" value={money(deduct)} />
            <DetailRow label="Staff Included" value={`${activeRun.employeeIds.length} employees`} />
          </DetailSection>

          <DetailSection title="DISBURSEMENT PROGRESS">
            <StatBar
              label="Payroll Completion"
              value={activeRun.status === 'Paid' ? 100 : activeRun.status === 'Validated' ? 75 : 50}
              displayValue={activeRun.status}
              variant={activeRun.status === 'Paid' ? 'green' : 'gold'}
            />
          </DetailSection>

          <DetailSection title="QUICK ACTIONS">
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() => navigate('run', activeRun.id)}
            >
              <ArrowUpRight className="size-3.5 text-[#c99a2e]" />
              <span className="doc-chip-name">Open Payrun Workflow</span>
            </button>
            <button
              className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer"
              onClick={() =>
                downloadCsv('payslips-' + activeRun.period + '.csv', [
                  ['Employee', 'Period', 'Basic', 'Gross', 'Deductions', 'Net'],
                  ...activeRun.slips.map((p: Row) => [
                    empName(p.employeeId),
                    p.period,
                    p.basic,
                    p.gross,
                    p.deductions,
                    p.net,
                  ]),
                ])
              }
            >
              <Download className="size-3.5 text-slate-500" />
              <span className="doc-chip-name">Export Generated Payslips</span>
            </button>
          </DetailSection>
        </DetailPanel>
      );
    }
  }

  if (!mounted || !s) {
    return (
      <PageShell
        currentView={view}
        onNavigate={navigate}
        title="PeoplePay360"
        badgeText="Opening…"
        error={error}
        message={message}
        onReload={() => void load()}
      >
        <div className="workora-card text-center py-20 bg-white rounded-2xl border border-[#e5ded4] shadow-2xs">
          <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3" />
          <h2 className="text-base font-semibold text-slate-900">Opening your workspace…</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Loading employees, attendance, and payroll records.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        currentView={view}
        onNavigate={navigate}
        title={pageTitle}
        backAction={backAction}
        actions={headerActions}
        leftPanel={leftSlot}
        rightPanel={rightSlot}
        signedIn={signedIn}
        onClockClick={() => setModal({ kind: 'clock' })}
        onAboutClick={() => setModal({ kind: 'about' })}
        onNotificationClick={() => setMessage('Workspace synchronized with live database.')}
        error={error}
        message={message}
        onReload={() => void load()}
      >
        {centerContent}
      </PageShell>

      {/* ─── Modals and Dialogs ─── */}
      {modal && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open && !busy) {
              setModal(null);
              setError('');
            }
          }}
        >
        <DialogContent className="workora-modal">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {modal?.kind === 'form'
                  ? (modal.record?.id ? 'Edit ' : 'New ') + (titles[modal.collection!] || 'Record')
                  : modal?.kind === 'wizard'
                  ? 'New Payrun Workflow'
                  : modal?.kind === 'slip'
                  ? 'Employee Payslip'
                  : modal?.kind === 'clock'
                  ? 'Attendance Check-in'
                  : modal?.kind === 'about'
                  ? 'About PeoplePay360'
                  : modal?.kind === 'allocation'
                  ? 'Leave Allocation'
                  : 'Time Off Request'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {modal?.kind === 'about'
                  ? 'PeoplePay360 · Crextio Design System'
                  : modal?.kind === 'clock'
                  ? 'Nisha Rao · Finance Manager · Live Shift'
                  : 'Connected records. One unified workspace.'}
              </DialogDescription>
            </div>
          </div>

          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-3">{error}</div>}

          {modal?.kind === 'form' && s && (
            <RecordForm
              key={modal.collection + modal.record!.id}
              collection={modal.collection!}
              initial={modal.record!}
              s={s}
              busy={busy}
              onSave={saveRecord}
              onCancel={() => setModal(null)}
            />
          )}

          {modal?.kind === 'wizard' && s && (
            <PayrunWizard
              s={s}
              busy={busy}
              onCancel={() => setModal(null)}
              onCreate={async (p) => {
                const result = await act('createPayrun', p, 'Payrun created.');
                if (result) {
                  const created = result.payruns.at(-1)!;
                  setPeriod(created.period);
                  navigate('run', created.id);
                }
              }}
            />
          )}

          {(modal?.kind === 'request' || modal?.kind === 'allocation') && reviewedRecord && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Avatar name={empName(reviewedRecord.employeeId)} />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{empName(reviewedRecord.employeeId)}</span>
                    <span className="text-[11px] text-slate-400 block">{leaveType(reviewedRecord.typeId)?.name}</span>
                  </div>
                </div>
                <Badge value={reviewedRecord.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Start Date', reviewedRecord.start],
                  ['End Date', reviewedRecord.end],
                  [
                    'Duration / Amount',
                    (reviewedRecord.duration || reviewedRecord.amount) +
                      ' ' +
                      leaveType(reviewedRecord.typeId)?.unit.toLowerCase(),
                  ],
                  ['Reviewer', reviewedRecord.approver || 'Awaiting approval'],
                ].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-white border border-slate-100">
                    <span className="text-[11px] text-slate-400 block">{k}</span>
                    <span className="text-xs font-semibold text-slate-800 block mt-0.5">{v}</span>
                  </div>
                ))}
              </div>

              {reviewedRecord.reason && (
                <p className="p-3 rounded-xl bg-slate-50 text-xs text-slate-600 border border-slate-100">
                  {reviewedRecord.reason}
                </p>
              )}
              {modal.kind === 'allocation' && s && (
                <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center text-xs">
                  <span>Available Balance</span>
                  <span className="font-bold text-sm">{allocationBalance(s, reviewedRecord)}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {reviewedRecord.status === 'Pending' && (
                  <>
                    <button
                      className="pill-btn !py-1.5 cursor-pointer"
                      disabled={busy}
                      onClick={() => openForm(modal.kind === 'request' ? 'requests' : 'allocations', reviewedRecord)}
                    >
                      Edit
                    </button>
                    {modal.kind === 'request' && (
                      <button
                        className="pill-btn !py-1.5 cursor-pointer"
                        disabled={busy}
                        onClick={() => void act('refuseLeave', { id: reviewedRecord.id }, 'Request refused.')}
                      >
                        Refuse
                      </button>
                    )}
                    <button
                      className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
                      disabled={busy}
                      onClick={() =>
                        void act(
                          modal.kind === 'request' ? 'approveLeave' : 'approveAllocation',
                          { id: reviewedRecord.id },
                          'Approved.'
                        )
                      }
                    >
                      Approve
                    </button>
                  </>
                )}
                <button className="pill-btn !py-1.5 cursor-pointer" onClick={() => setModal(null)}>
                  Close
                </button>
              </div>
            </div>
          )}

          {modal?.kind === 'slip' && modal.record && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    OXP PVT LTD
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{empName(modal.record.employeeId)}</h3>
                  <p className="text-xs text-slate-500">
                    {niceMonth(modal.record.period)} · {structure(modal.record.structureId)}
                  </p>
                </div>
                <Badge value={modal.record.status || 'Computed'} />
              </div>

              <DataTable
                rows={modal.record.lines?.map((l: any) => ({ ...l, id: l.code })) || []}
                columns={[
                  { title: 'Salary Component', render: (l) => l.name },
                  { title: 'Category', render: (l) => l.category },
                  { title: 'Amount', render: (l) => (l.category === 'Deduction' ? '- ' : '') + money(l.amount) },
                ]}
              />

              <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm">
                <span>Net Salary</span>
                <span className="text-lg font-bold">{money(modal.record.net)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button className="pill-btn !py-1.5 cursor-pointer" onClick={() => setModal(null)}>
                  Close
                </button>
                <button
                  className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
                  onClick={() => window.print()}
                >
                  <Download size={13} /> Print / PDF
                </button>
              </div>
            </div>
          )}

          {modal?.kind === 'clock' && s && (
            <div className="space-y-4 text-center py-2">
              <div className="text-4xl font-extrabold tracking-tight text-slate-900">
                {mounted && clockNow
                  ? clockNow.toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '10:00 AM'}
              </div>
              <p className="text-xs text-slate-400">
                Today ·{' '}
                {mounted && clockNow
                  ? clockNow.toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'long',
                    })
                  : '5 September'}{' '}
                · Asia/Kolkata
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {signedIn
                    ? 'Checked in at ' + currentClock?.checkIn
                    : currentClock?.checkOut
                    ? 'Today’s shift completed'
                    : 'You are not checked in'}
                </span>
                <Badge value={signedIn ? 'Present' : currentClock?.checkOut ? 'Completed' : 'Not checked in'} />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  className="pill-btn cursor-pointer"
                  onClick={() => {
                    setModal(null);
                    navigate('attendance');
                  }}
                >
                  View Records
                </button>
                <button
                  className="pill-btn pill-btn-black cursor-pointer"
                  disabled={busy || !!currentClock?.checkOut}
                  onClick={() => void act('clock', { employeeId: 'e6' }, signedIn ? 'Checked out.' : 'Checked in.')}
                >
                  {signedIn ? 'Check out' : 'Check in'}
                </button>
              </div>
            </div>
          )}

          {modal?.kind === 'about' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border border-amber-100/80 text-center">
                <img
                  src="/logo.jpg"
                  alt="PeoplePay360"
                  className="w-24 h-24 rounded-2xl object-contain shadow-xs border border-amber-200/60 bg-white mb-2"
                />
                <h3 className="font-extrabold text-slate-900 text-base flex items-center">
                  peoplepay<span className="text-[#e6a817]">360</span>
                </h3>
                <p className="text-[10px] font-bold tracking-widest text-amber-700/80 uppercase mt-0.5">
                  People • Payroll • Progress
                </p>
              </div>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-100 leading-relaxed text-slate-600">
                PeoplePay360 is a full-lifecycle HR & Payroll platform featuring real-time attendance punch integration, flexible salary rule calculation engines, compliant tax schedules, and leave ledger controls.
              </p>
              <div className="flex justify-end pt-1">
                <button className="pill-btn pill-btn-black !py-1.5 cursor-pointer" onClick={() => setModal(null)}>
                  Back to Workspace
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      )}
    </>
  );
}

function PayrunWizard({
  s,
  busy,
  onCreate,
  onCancel,
}: {
  s: Workspace;
  busy: boolean;
  onCreate: (p: Record<string, any>) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState('2026-10');
  const [structureId, setStructureId] = useState(s.structures[0]?.id || '');
  const [ids, setIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const eligible = s.employees.filter((e) => {
    if (e.status !== 'Active' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return false;
    try {
      const c = activeContract(s, e.id, period);
      return (
        c.structureId === structureId &&
        !s.payruns.some((r) => r.period === period && r.employeeIds.includes(e.id))
      );
    } catch {
      return false;
    }
  });

  const toggle = (id: string, checked: boolean) =>
    setIds((x) => (checked ? [...x, id] : x.filter((i) => i !== id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs font-semibold pb-2 border-b border-slate-100">
        <span className={step === 1 ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400'}>
          01 · Scope & Period
        </span>
        <span className={step === 2 ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400'}>
          02 · Select Employees
        </span>
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <Field label="Salary Structure">
            <Picker
              label="Salary structure"
              value={structureId}
              onChange={setStructureId}
              options={s.structures.filter((st) => st.active).map((st) => ({ value: st.id, label: st.name }))}
            />
          </Field>
          <Field label="Payroll Month">
            <Input
              type="month"
              required
              aria-label="Payroll month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 rounded-xl"
            />
          </Field>
          <p className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 border border-slate-100">
            Only active employees with a contract covering this month matching the selected structure are eligible.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="pill-search flex-1 !py-1">
              <Search size={13} className="text-slate-400 shrink-0" />
              <input
                aria-label="Search eligible employees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search eligible employees…"
              />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {ids.length} selected
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2">
            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
              <Checkbox
                checked={eligible.length > 0 && ids.length === eligible.length}
                onCheckedChange={(v) => setIds(v ? eligible.map((e) => e.id) : [])}
              />
              Select all eligible employees ({eligible.length})
            </label>
            {eligible
              .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
              .map((e) => (
                <label
                  key={e.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                >
                  <Checkbox checked={ids.includes(e.id)} onCheckedChange={(v) => toggle(e.id, !!v)} />
                  <Avatar name={e.name} />
                  <span className="font-medium">{e.name}</span>
                  <span className="text-[11px] text-slate-400 ml-auto">
                    {e.department}
                    {!e.bank ? ' · Bank missing' : ''}
                  </span>
                </label>
              ))}
            {!eligible.length && (
              <div className="py-6 text-center text-xs text-slate-400">No eligible employees found.</div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button className="pill-btn !py-1.5 cursor-pointer" onClick={step === 1 ? onCancel : () => setStep(1)}>
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        {step === 1 ? (
          <button
            className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
            disabled={!structureId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)}
            onClick={() => {
              setIds([]);
              setStep(2);
            }}
          >
            Continue <ArrowUpRight size={13} />
          </button>
        ) : (
          <button
            className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
            disabled={busy || !ids.length}
            onClick={() => void onCreate({ period, structureId, employeeIds: ids })}
          >
            {busy ? 'Creating…' : 'Create payrun'}
          </button>
        )}
      </div>
    </div>
  );
}
