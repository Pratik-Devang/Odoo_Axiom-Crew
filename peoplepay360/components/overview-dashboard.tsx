'use client';

import { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  Clock3,
  FileText,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { type Workspace, money } from '@/lib/domain';
import { buildDashboardSnapshot } from '@/lib/dashboard-calculations';
import { niceMonth } from '@/components/peoplepay-ui';
import { MonthlySalaryTrendCard } from '@/components/dashboard/MonthlySalaryTrendCard';

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

export default function OverviewDashboard({ s, period, setPeriod, department, setDepartment, employeeType, navigate }: {
  s: Workspace;
  period: string;
  setPeriod: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  employeeType: string;
  navigate: (view: string, id?: string) => void;
}) {
  const snapshot = useMemo(
    () => buildDashboardSnapshot(s, { period, department, employeeType }),
    [s, period, department, employeeType]
  );
  const attention = [
    { tag: 'Action', text: '1 payrun awaiting completion', sub: `${niceMonth(period)} · Review and process payroll` },
    { tag: 'Review', text: `${snapshot.workforceHealth.pendingRequests} time-off requests to review`, sub: 'Review leave approvals to keep operations smooth' },
    { tag: 'Action', text: `${s.employees.filter((employee) => !employee.bank).length} missing bank account`, sub: 'Employee payment information is incomplete' },
    { tag: 'Notice', text: '1 contract expiring this month', sub: 'Review upcoming employment term changes' },
  ];
  const maxDept = Math.max(...snapshot.departmentShare.map((row) => row.amount), 1);
  const attendanceStats = [
    { label: 'Present', value: snapshot.workforceHealth.presentCount, tone: 'green' },
    { label: 'Late', value: snapshot.workforceHealth.lateCount, tone: 'gold' },
    { label: 'Absent', value: snapshot.workforceHealth.absentCount, tone: 'red' },
    { label: 'Over 9h', value: snapshot.workforceHealth.overtimeCount, tone: 'blue' },
  ];

  return (
    <div className="overview-dashboard-grid">
      <main className="overview-canvas">
        <div className="overview-kpis">
          <Metric label="Total net paid" value={money(snapshot.kpis.totalNet)} sub={`${snapshot.kpis.paidSlips} payslips paid`} icon={Wallet} tone="dark" />
          <Metric label="Generated slips" value={String(snapshot.kpis.slipCount)} sub={`${Math.max(0, snapshot.kpis.slipCount - snapshot.kpis.paidSlips)} pending payment`} icon={FileText} />
          <Metric label="Average net pay" value={money(snapshot.kpis.avgNet)} sub="Per generated payslip" icon={Users} />
          <Metric label="Attendance health" value={`${snapshot.workforceHealth.healthRate ?? 94}%`} sub={`${snapshot.workforceHealth.completeCount} shifts complete`} icon={Activity} tone="gold" />
        </div>

        <div className="overview-middle-grid">
          <MonthlySalaryTrendCard
            points={snapshot.trend}
            period={period}
            onPeriodChange={setPeriod}
            onManagePayruns={() => navigate('payruns')}
          />

        </div>

        <div className="overview-bottom-grid">
          <section className="overview-panel dept-panel">
            <header><h2><Briefcase size={14} /> Salary Cost by Dept</h2><span>Gross</span></header>
            <div className="mini-bars department-bars">
              {snapshot.departmentShare.slice(0, 6).map((row) => (
                <button
                  aria-label={row.name === department
                    ? `Clear ${row.name} department filter`
                    : `Filter by ${row.name}, gross salary cost ${money(row.amount)}`}
                  aria-pressed={row.name === department}
                  className={row.name === department ? 'selected' : ''}
                  key={row.name}
                  onClick={() => setDepartment(row.name === department ? 'All' : row.name)}
                  title={row.name === department
                    ? `Clear ${row.name} filter`
                    : `${row.name}: ${money(row.amount)}`}
                >
                  <span><i style={{ height: `${Math.max(4, row.amount / maxDept * 82)}%` }} /></span>
                  <b>{row.name}</b>
                </button>
              ))}
            </div>
            <footer>
              {department === 'All' ? (
                <span><i aria-hidden="true" /> Selected department</span>
              ) : (
                <button className="dept-clear-filter" onClick={() => setDepartment('All')}>
                  <X size={10} aria-hidden="true" /> Clear selection
                </button>
              )}
              <span>Values in INR (₹)</span>
            </footer>
          </section>
          <section className="overview-panel attendance-panel">
            <header>
              <h2><Clock3 size={14} /> Attendance Overview</h2>
              <button type="button" onClick={() => navigate('attendance')}>
                View logs <ArrowUpRight size={12} />
              </button>
            </header>
            <div className="attendance-stats" aria-label={`Attendance summary for ${niceMonth(period)}`}>
              {attendanceStats.map(({ label, value, tone }) => (
                <button
                  aria-label={`${value} ${label.toLowerCase()} attendance records. View logs`}
                  className={`attendance-stat ${tone}`}
                  key={label}
                  onClick={() => navigate('attendance')}
                  type="button"
                >
                  <b>{value.toLocaleString()}</b>
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <footer>
              <span><i className="attendance-footer-dot warning" aria-hidden="true" />{snapshot.workforceHealth.missingCheckoutCount.toLocaleString()} missing check-outs</span>
              <span><i className="attendance-footer-dot neutral" aria-hidden="true" />{snapshot.workforceHealth.manualEntryCount.toLocaleString()} manual entries</span>
            </footer>
          </section>
          <section className="overview-panel attention-panel">
            <header><h2><Activity size={14} /> Needs Attention</h2><span>{attention.length} items</span></header>
            <div className="attention-list">
              {attention.map((item) => <div key={item.text}><span><b>{item.tag}</b><strong>{item.text}</strong><small>{item.sub}</small></span><button onClick={() => navigate(item.tag === 'Review' ? 'requests' : 'payruns')}>Fix <ChevronRight size={11} /></button></div>)}
            </div>
          </section>
        </div>
      </main>


    </div>
  );
}
