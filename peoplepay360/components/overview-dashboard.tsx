'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileClock,
  FileText,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { type Row, type Workspace, activeContract, money } from '@/lib/domain';
import { buildDashboardSnapshot, employeeNetForPeriod } from '@/lib/dashboard-calculations';
import { niceMonth } from '@/components/peoplepay-ui';

const modules = [
  { group: 'People', items: [
    ['Employees', 'Team directory & profiles', Users, 'employees'],
    ['Contracts', 'Terms & salary structures', Briefcase, 'contracts'],
    ['Schedules', 'Working hours & shifts', Clock3, 'schedules'],
  ] },
  { group: 'Time off', items: [
    ['Leave Requests', 'Review & approval process', CalendarDays, 'requests'],
    ['Allocations', 'Entitlements & pool balances', Layers3, 'allocations'],
    ['Leave Policies', 'Paid & unpaid policy types', Sparkles, 'leaveTypes'],
  ] },
  { group: 'Payroll', items: [
    ['Payruns', 'Compute & validate monthly pay', Wallet, 'payruns'],
    ['Payslips', 'Generated salary breakdowns', FileClock, 'payslips'],
    ['Salary Structures', 'Rule groups & blueprints', SlidersHorizontal, 'structures'],
    ['Salary Rules', 'Formula & calculation logic', Calculator, 'rules'],
  ] },
] as const;

function initials(name: string) {
  return name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase();
}

function Metric({ label, value, sub, tone = 'plain', icon: Icon }: {
  label: string; value: string; sub: string; tone?: 'plain' | 'dark' | 'gold'; icon: typeof Wallet;
}) {
  return (
    <div className={`overview-metric ${tone}`}>
      <span className="overview-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
      <span className="overview-metric-icon"><Icon size={15} /></span>
    </div>
  );
}

export default function OverviewDashboard({ s, period, setPeriod, department, setDepartment, employeeType, setEmployeeType, navigate }: {
  s: Workspace;
  period: string;
  setPeriod: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  employeeType: string;
  setEmployeeType: (value: string) => void;
  navigate: (view: string, id?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(s.employees[0]?.id || '');
  const snapshot = buildDashboardSnapshot(s, { period, department, employeeType });
  const employees = useMemo(() => snapshot.activeEmployees.filter((employee) =>
    !query || [employee.name, employee.department, employee.position].some((value) =>
      String(value).toLowerCase().includes(query.toLowerCase())
    )), [snapshot.activeEmployees, query]);
  const selected = s.employees.find((employee) => employee.id === selectedId) || employees[0] || s.employees[0];
  const selectedSlip = snapshot.slips.find((slip) => slip.employeeId === selected?.id);
  const selectedPay = selected ? employeeNetForPeriod(s, selected.id, period, selectedSlip) : { net: 0, gross: 0, hasSlip: false };
  let contract: Row | undefined;
  try { contract = selected ? activeContract(s, selected.id, period) : undefined; } catch { contract = undefined; }
  const schedule = s.schedules.find((item) => item.id === (contract?.scheduleId || selected?.scheduleId));
  const requests = s.requests.filter((item) => item.employeeId === selected?.id && item.status === 'Approved');
  const attendance = s.attendance.filter((item) => item.employeeId === selected?.id && item.date.startsWith(period));
  const attendanceRate = attendance.length ? Math.round(attendance.filter((item) => item.checkIn).length / attendance.length * 100) : 100;
  const attention = [
    { tag: 'Action', text: '1 payrun awaiting completion', sub: `${niceMonth(period)} · Review and process payroll` },
    { tag: 'Review', text: `${snapshot.workforceHealth.pendingRequests} time-off requests to review`, sub: 'Review leave approvals to keep operations smooth' },
    { tag: 'Action', text: `${s.employees.filter((employee) => !employee.bank).length} missing bank account`, sub: 'Employee payment information is incomplete' },
    { tag: 'Notice', text: '1 contract expiring this month', sub: 'Review upcoming employment term changes' },
  ];
  const maxTrend = Math.max(...snapshot.trend.map((point) => point.value), 1);
  const maxDept = Math.max(...snapshot.departmentShare.map((row) => row.amount), 1);

  return (
    <div className="overview-dashboard-grid">
      <aside className="overview-modules">
        <div className="module-search-wrap">
          <p>Module Library</p>
          <label><Search size={14} /><input placeholder="Search modules..." /></label>
        </div>
        {modules.map((group) => (
          <section key={group.group}>
            <h3>{group.group}</h3>
            {group.items.map(([label, desc, Icon, view]) => (
              <button key={label} onClick={() => navigate(view)}>
                <span className="module-icon"><Icon size={16} /></span>
                <span><b>{label}</b><small>{desc}</small></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </section>
        ))}
      </aside>

      <aside className="overview-roster">
        <div className="roster-controls">
          <div><b>Team · {employees.length}</b><button onClick={() => setEmployeeType('All')}>All <ChevronDown size={12} /></button></div>
          <div>
            <label>{niceMonth(period).replace(' 2026', '')}<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
            <button onClick={() => setDepartment('All')}>{department} <ChevronDown size={12} /></button>
          </div>
          <label className="roster-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee..." /></label>
        </div>
        <div className="roster-list">
          {employees.map((employee) => {
            const slip = snapshot.slips.find((item) => item.employeeId === employee.id);
            const pay = employeeNetForPeriod(s, employee.id, period, slip).net;
            const active = employee.id === selected?.id;
            return (
              <button aria-label={`Select ${employee.name}`} className={`roster-card ${active ? 'active' : ''}`} key={employee.id} onClick={() => setSelectedId(employee.id)}>
                <div><span className="roster-avatar">{initials(employee.name)}</span><span><b>{employee.name}</b><small>{employee.department} · {employee.type}</small></span><em>Active</em></div>
                <p><span>Net Pay</span><strong>{money(pay)}</strong></p>
                <i><span style={{ width: `${Math.max(18, Math.min(100, pay / Math.max(snapshot.maxEarnerNet, 1) * 100))}%` }} /></i>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="overview-canvas">
        <div className="overview-kpis">
          <Metric label="Total net paid" value={money(snapshot.kpis.totalNet)} sub={`${snapshot.kpis.paidSlips} payslips paid`} icon={Wallet} tone="dark" />
          <Metric label="Generated slips" value={String(snapshot.kpis.slipCount)} sub={`${Math.max(0, snapshot.kpis.slipCount - snapshot.kpis.paidSlips)} pending payment`} icon={FileText} />
          <Metric label="Average net pay" value={money(snapshot.kpis.avgNet)} sub="Per generated payslip" icon={Users} />
          <Metric label="Attendance health" value={`${snapshot.workforceHealth.healthRate ?? 94}%`} sub={`${snapshot.workforceHealth.completeCount} shifts complete`} icon={Activity} tone="gold" />
        </div>

        <div className="overview-middle-grid">
          <section className="overview-panel trend-panel">
            <header><div><h2><TrendingUp size={14} /> Monthly Net Salary Trend</h2><p>Six months · All departments</p></div><span className="paid-dot">Paid</span></header>
            <div className="mini-bars">
              {snapshot.trend.map((point) => (
                <button key={point.period} className={point.period === period ? 'selected' : ''} onClick={() => setPeriod(point.period)}>
                  <span><i style={{ height: `${Math.max(4, point.value / maxTrend * 82)}%` }} /></span><b>{point.label}</b>
                </button>
              ))}
            </div>
            <footer><span>● Selected period highlighted</span><span>Values in INR (₹)</span></footer>
          </section>

          <section className="overview-panel attention-panel">
            <header><h2><Activity size={14} /> Needs Attention</h2><span>{attention.length} items</span></header>
            <div className="attention-list">
              {attention.map((item) => <div key={item.text}><span><b>{item.tag}</b><strong>{item.text}</strong><small>{item.sub}</small></span><button onClick={() => navigate(item.tag === 'Review' ? 'requests' : 'payruns')}>Fix <ChevronRight size={11} /></button></div>)}
            </div>
          </section>
        </div>

        <div className="overview-bottom-grid">
          <section className="overview-panel dept-panel">
            <header><h2><Briefcase size={14} /> Salary Cost by Dept</h2><span>Gross</span></header>
            <div>{snapshot.departmentShare.slice(0, 6).map((row) => <button aria-label={`Filter by ${row.name}`} key={row.name} onClick={() => setDepartment(row.name)}><p><span>{row.name}</span><b>{money(row.amount)}</b></p><i><span style={{ width: `${row.amount / maxDept * 100}%` }} /></i></button>)}</div>
          </section>
          <section className="overview-panel attendance-panel">
            <header><h2><Clock3 size={14} /> Attendance Overview</h2><button onClick={() => navigate('attendance')}>View logs <ArrowUpRight size={12} /></button></header>
            <div className="attendance-stats">
              {[['Present', snapshot.workforceHealth.presentCount, 'green'], ['Late', snapshot.workforceHealth.lateCount, 'gold'], ['Absent', snapshot.workforceHealth.absentCount, 'red'], ['Over 9h', snapshot.workforceHealth.overtimeCount, 'blue']].map(([label, value, color]) => <button className={String(color)} key={String(label)} onClick={() => navigate('attendance')}><b>{value}</b><span>{label}</span></button>)}
            </div>
            <footer><span>● 0 missing check-outs</span><span>● 0 manual entries</span></footer>
          </section>
        </div>
      </main>

      <aside className="overview-profile">
        <header><span className="profile-avatar">{initials(selected?.name || 'Employee')}</span><h2>{selected?.name}</h2><p>{selected?.department}</p><div><span>● Active</span><span>{selected?.type}</span></div><nav><button onClick={() => selected && navigate('employee', selected.id)}>View Profile</button><button onClick={() => selected && navigate('attendance', selected.id)}>Attendance</button></nav></header>
        <section><h3>Basic information</h3><dl><dt>Manager</dt><dd>{selected?.manager || 'Sara Khan'}</dd><dt>Location</dt><dd>{selected?.location || 'Mumbai'}</dd><dt>Schedule</dt><dd>{schedule?.name || 'Standard workweek'}</dd><dt>Bank</dt><dd>{selected?.bank ? '✓ Registered' : 'Missing'}</dd></dl></section>
        <section><h3>Contract</h3><dl><dt>Start</dt><dd>{contract?.start || '—'}</dd><dt>End</dt><dd>{contract?.end || 'Open-ended'}</dd><dt>Wage</dt><dd>{money(contract?.wage || 0)}/mo</dd><dt>Structure</dt><dd>{s.structures.find((item) => item.id === contract?.structureId)?.name || 'Regular Salary'}</dd></dl><button className="contract-chip"><FileText size={13} /> Contract · {contract?.start || 'Current'}</button></section>
        <section><h3>Statistics · {niceMonth(period)}</h3><div className="profile-stat"><p><span>Net Pay this period</span><b>{money(selectedPay.net)}</b></p><i><span style={{ width: '78%' }} /></i></div><div className="profile-stat green"><p><span>Attendance rate</span><b>{attendanceRate}%</b></p><i><span style={{ width: `${attendanceRate}%` }} /></i></div><div className="profile-stat"><p><span>Leave used</span><b>{requests.reduce((sum, item) => sum + (+item.duration || 0), 0)} days</b></p><i><span style={{ width: '24%' }} /></i></div></section>
        <section><h3>Quick actions</h3><button className="profile-action" onClick={() => navigate('contracts')}>View Contracts <ChevronRight size={13} /></button><button className="profile-action" onClick={() => navigate('requests')}>Time Off Requests <ChevronRight size={13} /></button><button className="profile-action" onClick={() => selected && navigate('attendance', selected.id)}>Employee Attendance <ChevronRight size={13} /></button></section>
      </aside>
    </div>
  );
}
