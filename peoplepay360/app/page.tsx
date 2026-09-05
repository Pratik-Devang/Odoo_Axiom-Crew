'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Clock3,
  LayoutGrid,
  List,
  Download,
  ArrowLeft,
  Check,
  RefreshCw,
  FileText,
  Search,
  Users,
  Briefcase,
  CalendarDays,
  Wallet,
  Bell,
  HelpCircle,
  Sparkles,
  SlidersHorizontal,
  Calculator,
  Play,
  X,
  Shield,
  ShieldAlert,
  LogOut,
  UserCheck,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  type Workspace,
  type Row,
  type AppUser,
  canView,
  money,
  hours,
  activeContract,
  warnings,
  allocationBalance,
  monthEnd
} from '@/lib/domain';
import { Avatar, Badge, DataTable, Field, Picker, niceMonth, downloadCsv } from '@/components/peoplepay-ui';
import Dashboard from '@/components/payroll-dashboard';
import RecordForm, { defaults, titles } from '@/components/record-form';

type Modal = {
  kind: 'form' | 'request' | 'allocation' | 'wizard' | 'slip' | 'clock' | 'about';
  collection?: string;
  record?: Row;
};

const descriptions: Record<string, string> = {
  employees: 'The people who make it all happen.',
  contracts: 'Employment terms, current contracts, and the full history.',
  attendance: 'Review presence, working hours, and attendance exceptions.',
  requests: 'A little time away. A clear approval process.',
  allocations: 'Leave entitlements, approvals, and available balances.',
  leaveTypes: 'Set the policies behind every time off request.',
  schedules: 'Define your team’s working week.',
  payruns: 'From contract to payslip, one connected workflow.',
  payslips: 'Every salary, with a clear breakdown.',
  structures: 'Group the rules that shape employee pay.',
  rules: 'Configure the calculation behind every salary component.',
  users: 'Manage user access, credentials, and role permissions.'
};

const TOP_NAV_ITEMS = [
  { href: '#payroll/dashboard', section: 'payroll/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '#employees', section: 'employees', label: 'Employees', icon: Users },
  { href: '#contracts', section: 'contracts', label: 'Contracts', icon: Briefcase },
  { href: '#attendance', section: 'attendance', label: 'Attendance', icon: Clock3 },
  { href: '#time-off', section: 'time-off', label: 'Time Off', icon: CalendarDays },
  { href: '#payroll/payruns', section: 'payroll/payruns', label: 'Payruns', icon: Play },
  { href: '#payroll/payslips', section: 'payroll/payslips', label: 'Payslips', icon: FileText },
  { href: '#payroll/structures', section: 'payroll/structures', label: 'Structures', icon: SlidersHorizontal },
  { href: '#payroll/rules', section: 'payroll/rules', label: 'Rules', icon: Calculator },
  { href: '#admin/users', section: 'admin/users', label: 'Users', icon: Shield },
];

function parseHash(hash: string): { section: string; view: string; id: string } {
  const clean = hash.replace(/^#/, '');
  if (!clean || clean === 'overview' || clean === 'payroll/dashboard') {
    return { section: 'payroll/dashboard', view: 'overview', id: '' };
  }
  if (clean.startsWith('payroll/')) {
    const sub = clean.slice(8);
    if (sub === 'dashboard') return { section: 'payroll/dashboard', view: 'overview', id: '' };
    if (sub === 'payruns') return { section: 'payroll/payruns', view: 'payruns', id: '' };
    if (sub === 'payslips') return { section: 'payroll/payslips', view: 'payslips', id: '' };
    if (sub === 'structures') return { section: 'payroll/structures', view: 'structures', id: '' };
    if (sub === 'rules') return { section: 'payroll/rules', view: 'rules', id: '' };
    const [subView, id] = sub.split('/');
    return { section: clean, view: subView, id: decodeURIComponent(id || '') };
  }
  if (clean.startsWith('admin/')) {
    const sub = clean.slice(6);
    if (sub === 'users') return { section: 'admin/users', view: 'users', id: '' };
    return { section: clean, view: sub, id: '' };
  }
  if (clean === 'time-off') {
    return { section: 'time-off', view: 'requests', id: '' };
  }
  const [v, id] = clean.split('/');
  return { section: v, view: v, id: decodeURIComponent(id || '') };
}

function defaultRouteForRole(role?: string): string {
  if (role === 'Employee') return '#attendance';
  if (role === 'HR Manager') return '#employees';
  return '#payroll/dashboard';
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [s, setS] = useState<Workspace | null>(null);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState('overview');
  const [currentSection, setCurrentSection] = useState('payroll/dashboard');
  const [activeId, setActiveId] = useState('');
  const [filterId, setFilterId] = useState('');
  const [query, setQuery] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [mode, setMode] = useState('grid');
  const [period, setPeriod] = useState('2026-09');
  const [department, setDepartment] = useState('All');
  const [employeeType, setEmployeeType] = useState('All');
  const [modal, setModal] = useState<Modal | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockNow, setClockNow] = useState(new Date());

  // Admin users state
  const [usersList, setUsersList] = useState<Row[]>([]);

  // Check auth on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const r = await fetch('/api/auth/me');
        if (r.ok) {
          const body = await r.json();
          if (body.user) {
            setCurrentUser(body.user);
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setAuthChecking(false);
      }
    }
    void checkAuth();
  }, []);

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const body = (await r.json()) as any;
      if (!r.ok) throw new Error(body.error);
      setS(body.data);
      setRevision(body.revision);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/users');
      if (r.ok) {
        const body = await r.json();
        setUsersList(body.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      void load();
      if (currentUser.role === 'Admin') {
        void loadUsers();
      }
    }
    const timer = setInterval(() => setClockNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [currentUser, load, loadUsers]);

  // Routing synchronization
  useEffect(() => {
    const read = () => {
      const parsed = parseHash(window.location.hash);
      setCurrentSection(parsed.section);
      setView(parsed.view);
      setActiveId(parsed.id);
      setFilterId('');
    };

    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  function navigate(v: string, id?: string) {
    let targetHash = v;
    let targetView = v;

    if (v === 'overview' || v === 'payroll/dashboard') {
      targetHash = '#payroll/dashboard';
      targetView = 'overview';
    } else if (v === 'payruns' || v === 'payroll/payruns') {
      targetHash = id ? `#payroll/payruns/${id}` : '#payroll/payruns';
      targetView = id ? 'run' : 'payruns';
    } else if (v === 'payslips' || v === 'payroll/payslips') {
      targetHash = '#payroll/payslips';
      targetView = 'payslips';
    } else if (v === 'structures' || v === 'payroll/structures') {
      targetHash = '#payroll/structures';
      targetView = 'structures';
    } else if (v === 'rules' || v === 'payroll/rules') {
      targetHash = '#payroll/rules';
      targetView = 'rules';
    } else if (v === 'users' || v === 'admin/users') {
      targetHash = '#admin/users';
      targetView = 'users';
    } else if (v === 'requests' || v === 'time-off') {
      targetHash = '#time-off';
      targetView = 'requests';
    } else if (v === 'employees') {
      targetHash = id ? `#employees/${id}` : '#employees';
      targetView = id ? 'employee' : 'employees';
    } else {
      targetHash = id ? `#${v}/${id}` : `#${v}`;
      targetView = v;
    }

    setView(targetView);
    setActiveId(id || '');
    setFilterId('');
    setQuery('');
    setModal(null);
    setError('');
    setMessage('');
    window.history.pushState(null, '', targetHash);
    const parsed = parseHash(targetHash);
    setCurrentSection(parsed.section);
  }

  function related(v: string, id: string) {
    navigate(v);
    setFilterId(id);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    window.location.hash = '';
  }

  async function act(action: string, payload: Record<string, any> = {}, success = 'Changes saved'): Promise<Workspace | null> {
    if (busy) return null;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload, revision })
      });
      const b = (await r.json()) as any;
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

  const employee = (id: string) => s?.employees.find(e => e.id === id);
  const empName = (id: string) => employee(id)?.name || 'Unknown employee';
  const structure = (id: string) => s?.structures.find(t => t.id === id)?.name || 'Unknown structure';
  const leaveType = (id: string) => s?.leaveTypes.find(t => t.id === id);

  function openForm(collection: string, record?: Row) {
    if (!s) return;
    setError('');
    const defaultEmpId = currentUser?.role === 'Employee' && currentUser?.employeeId ? currentUser.employeeId : filterId || undefined;
    setModal({
      kind: 'form',
      collection,
      record: record ? structuredClone(record) : defaults(collection, s, defaultEmpId)
    });
  }

  const saveRecord = async (record: Row) => {
    if (modal?.collection === 'users') {
      setBusy(true);
      setError('');
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const b = await res.json();
        if (!res.ok) throw new Error(b.error || 'Failed to save user');
        setMessage('User account saved successfully.');
        setModal(null);
        void loadUsers();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    const result = await act('save', { collection: modal!.collection, record });
    if (result) setModal(null);
  };

  const activeEmployee = employee(activeId);
  const run = s?.payruns.find(r => r.id === activeId);

  // Active employee for clock widget
  const clockEmployeeId = currentUser?.employeeId || (s?.employees[0]?.id ?? 'e0');
  const currentClock = s?.attendance.find(
    a => a.employeeId === clockEmployeeId && a.date === clockNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const signedIn = !!currentClock?.checkIn && !currentClock?.checkOut;

  // Filtered rows
  const filtered = (list: Row[]) => {
    let base = list;
    if (currentUser?.role === 'Employee' && currentUser?.employeeId) {
      if (['attendance', 'requests', 'allocations'].includes(view)) {
        base = list.filter(r => r.employeeId === currentUser.employeeId);
      }
    }
    return base.filter(r =>
      (!filterId || r.employeeId === filterId) &&
      (!query || [r.name, r.email, r.department, r.position, r.code, empName(r.employeeId)].some(x => String(x || '').toLowerCase().includes(query.toLowerCase())))
    );
  };

  const allSlips = (s?.payruns.flatMap(r => r.slips.map((p: Row) => ({ ...p, runId: r.id, status: r.status }))) || []).filter(p => {
    if (currentUser?.role === 'Employee' && currentUser.employeeId) {
      return p.employeeId === currentUser.employeeId;
    }
    return true;
  });

  const cellEmployee = (r: Row) => (
    <button className="flex items-center gap-2 text-left hover:underline" onClick={() => currentUser?.role !== 'Employee' && navigate('employee', r.employeeId)}>
      <Avatar name={empName(r.employeeId)} />
      <span>
        <span className="font-semibold text-slate-900 block leading-tight">{empName(r.employeeId)}</span>
        <span className="text-[11px] text-slate-400 block">{employee(r.employeeId)?.department}</span>
      </span>
    </button>
  );

  const attendanceStatus = (a: Row) => !a.checkIn ? 'Absent' : !a.checkOut ? 'Missing check-out' : a.checkIn > (s?.schedules.find(sc => sc.id === employee(a.employeeId)?.scheduleId)?.start || '09:00') ? 'Late' : 'Present';

  const runSlipColumns = [
    { title: 'Employee', render: cellEmployee },
    { title: 'Recorded days', render: (p: Row) => p.workedDays },
    { title: 'Basic', render: (p: Row) => money(p.basic) },
    { title: 'Gross', render: (p: Row) => money(p.gross) },
    { title: 'Deductions', render: (p: Row) => money(p.deductions) },
    { title: 'Net salary', render: (p: Row) => <b className="text-slate-900 font-bold">{money(p.net)}</b> },
    { title: 'Payslip', render: (p: Row) => <button className="inline-flex items-center gap-1 text-slate-900 hover:underline font-semibold" onClick={() => setModal({ kind: 'slip', record: p })}><FileText size={14} /> View</button> }
  ];

  const exportPayroll = () => {
    if (!s) return;
    downloadCsv('peoplepay-payroll.csv', [
      ['Period', 'Employee', 'Department', 'Gross', 'Deductions', 'Net', 'Status'],
      ...allSlips.filter(p => p.period === period).map(p => [p.period, empName(p.employeeId), employee(p.employeeId)?.department, p.gross, p.deductions, p.net, p.status])
    ]);
  };

  const libraryModules = [
    {
      category: 'PEOPLE',
      items: [
        { id: 'employees', title: 'Employees', desc: 'Team directory & profiles', icon: Users },
        { id: 'contracts', title: 'Contracts', desc: 'Terms & salary structures', icon: Briefcase },
        { id: 'attendance', title: 'Attendance', desc: 'Presence, punch logs & shifts', icon: Clock3 },
        { id: 'schedules', title: 'Schedules', desc: 'Working hours & shifts', icon: Clock3 },
      ]
    },
    {
      category: 'TIME OFF',
      items: [
        { id: 'requests', title: 'Leave Requests', desc: 'Review & approval process', icon: CalendarDays },
        { id: 'allocations', title: 'Allocations', desc: 'Entitlements & pool balances', icon: Layers },
        { id: 'leaveTypes', title: 'Leave Policies', desc: 'Paid & unpaid policy types', icon: Sparkles },
      ]
    },
    {
      category: 'PAYROLL',
      items: [
        { id: 'payroll/dashboard', title: 'Dashboard', desc: 'Payroll analytics & KPIs', icon: LayoutGrid },
        { id: 'payruns', title: 'Payruns', desc: 'Compute & validate monthly runs', icon: Play },
        { id: 'payslips', title: 'Payslips', desc: 'Generated salary breakdowns', icon: FileText },
        { id: 'structures', title: 'Salary Structures', desc: 'Rule groups & blueprints', icon: SlidersHorizontal },
        { id: 'rules', title: 'Salary Rules', desc: 'Formula & calculation logic', icon: Calculator },
      ]
    },
    ...(currentUser?.role === 'Admin' ? [{
      category: 'ADMINISTRATION',
      items: [
        { id: 'users', title: 'System Users', desc: 'Manage user roles & access', icon: Shield }
      ]
    }] : [])
  ];

  // 1. Initial Session Loader
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifying PeoplePay360 Session…</p>
        </div>
      </div>
    );
  }

  // 2. Login View gating the application
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const initialRoute = defaultRouteForRole(user.role);
          window.location.hash = initialRoute;
          const parsed = parseHash(initialRoute);
          setCurrentSection(parsed.section);
          setView(parsed.view);
        }}
      />
    );
  }

  // Check section access permissions
  const hasAccess = canView(currentUser.role, currentSection);

  // Role pill color styling
  const roleBadgeStyles: Record<string, string> = {
    'Admin': 'bg-purple-100 text-purple-800 border-purple-300',
    'HR Payroll Manager': 'bg-blue-100 text-blue-800 border-blue-300',
    'HR Payroll User': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'HR Manager': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'Employee': 'bg-amber-100 text-amber-800 border-amber-300'
  };

  return (
    <div className="workora-shell">
      {/* ─── Top Navigation Bar ─── */}
      <header className="workora-topbar">
        <a
          href={defaultRouteForRole(currentUser.role)}
          className="workora-brand"
          onClick={e => {
            e.preventDefault();
            navigate(defaultRouteForRole(currentUser.role).replace('#', ''));
          }}
        >
          <span className="workora-brand-dot" />
          peoplepay360
        </a>

        {/* Dynamic Top Navigation Pills filtered by canView(role, section) */}
        <nav className="workora-nav-pills flex-wrap" aria-label="Main Navigation">
          {TOP_NAV_ITEMS.filter(item => canView(currentUser.role, item.section)).map(item => {
            const isActive = currentSection === item.section ||
              (item.section === 'time-off' && ['requests', 'allocations', 'leaveTypes'].includes(view)) ||
              (item.section === 'employees' && (view === 'employees' || view === 'employee')) ||
              (item.section === 'payroll/payruns' && (view === 'payruns' || view === 'run'));
            return (
              <a
                key={item.section}
                href={item.href}
                className={'nav-pill ' + (isActive ? 'active' : '')}
                onClick={e => {
                  e.preventDefault();
                  navigate(item.section);
                }}
              >
                <item.icon size={15} />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Utility Buttons & User Info */}
        <div className="workora-top-actions items-center gap-2">
          {currentUser.employeeId && (
            <button
              className={'circle-btn ' + (signedIn ? 'clock-active' : '')}
              title={signedIn ? 'Checked in · Click to manage' : 'Check in to attendance'}
              aria-label="Attendance check-in"
              onClick={() => setModal({ kind: 'clock' })}
            >
              <Clock3 size={17} />
            </button>
          )}

          {/* User role and identity indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <span className="font-bold text-xs text-slate-800 block leading-tight">{currentUser.name}</span>
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${roleBadgeStyles[currentUser.role] || 'bg-slate-100 text-slate-700'}`}>
                {currentUser.role}
              </span>
            </div>
            <Avatar name={currentUser.name} />
            <button
              className="circle-btn hover:text-rose-600 hover:bg-rose-50"
              title="Sign Out"
              aria-label="Sign out"
              onClick={() => void handleLogout()}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Layout ─── */}
      <div className="workora-layout">
        {/* Left Module Library Panel (Filtered by Role) */}
        <aside className="workora-left-panel">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="panel-section-title !mb-0">MODULE LIBRARY</h3>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${roleBadgeStyles[currentUser.role] || 'bg-slate-100 text-slate-700'}`}>
                {currentUser.role}
              </span>
            </div>
            <div className="pill-search">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                placeholder="Search modules…"
                value={moduleSearch}
                onChange={e => setModuleSearch(e.target.value)}
              />
            </div>
          </div>

          {libraryModules.map(group => {
            const accessibleItems = group.items.filter(item => canView(currentUser.role, item.id));
            const visibleItems = accessibleItems.filter(item =>
              !moduleSearch ||
              item.title.toLowerCase().includes(moduleSearch.toLowerCase()) ||
              item.desc.toLowerCase().includes(moduleSearch.toLowerCase())
            );
            if (!visibleItems.length) return null;

            return (
              <div key={group.category} className="library-group">
                <h4 className="panel-section-title">{group.category}</h4>
                {visibleItems.map(item => {
                  const isActive = view === item.id ||
                    (item.id === 'payroll/dashboard' && view === 'overview') ||
                    (item.id === 'payruns' && view === 'run') ||
                    (item.id === 'employees' && view === 'employee');
                  return (
                    <button
                      key={item.id}
                      className={'library-card-item ' + (isActive ? 'active' : '')}
                      onClick={() => navigate(item.id)}
                    >
                      <div className="library-icon-box">
                        <item.icon size={16} />
                      </div>
                      <div className="library-item-content">
                        <p className="library-item-title">{item.title}</p>
                        <p className="library-item-desc">{item.desc}</p>
                      </div>
                      <ChevronRight size={14} className="library-item-arrow" />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Center Workspace ─── */}
        <main className="workora-main">
          {/* Sub-Header Action Bar */}
          <div className="workora-subbar">
            <div className="subbar-left">
              {['employee', 'run'].includes(view) && (
                <button
                  className="subbar-back"
                  onClick={() => navigate(view === 'employee' ? 'employees' : 'payruns')}
                  title="Go back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <h1 className="subbar-title">
                {view === 'overview'
                  ? 'Payroll & Workforce Overview'
                  : view === 'employee'
                    ? activeEmployee?.name || 'Employee Profile'
                    : view === 'run'
                      ? run?.name || 'Payrun Workflow'
                      : view === 'users'
                        ? 'User & Access Management'
                        : titles[view] || view}
              </h1>
              <span className="status-pill-badge">
                <span className="status-dot" />
                PostgreSQL · Role: {currentUser.role}
              </span>
            </div>

            <div className="subbar-right">
              {['attendance', 'payslips', 'payruns'].includes(view) && (
                <Input
                  type="month"
                  aria-label="Payroll period"
                  className="h-9 px-3 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-700 w-36 shadow-2xs"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                />
              )}

              {['overview', 'payslips', 'payruns'].includes(view) && currentUser.role !== 'Employee' && (
                <button className="pill-btn" onClick={exportPayroll} disabled={!s}>
                  <Download size={14} />
                  Export
                </button>
              )}

              {/* Action Buttons based on Role & Current View */}
              {view === 'overview' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) ? (
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={() => { setError(''); setModal({ kind: 'wizard' }); }}
                >
                  <Plus size={14} />
                  New Payrun
                  <ChevronDown size={13} className="ml-1 opacity-70" />
                </button>
              ) : view === 'employee' && ['Admin', 'HR Manager'].includes(currentUser.role) ? (
                <button
                  className="pill-btn pill-btn-black"
                  onClick={() => activeEmployee && openForm('employees', activeEmployee)}
                >
                  Edit Employee
                </button>
              ) : view === 'users' && currentUser.role === 'Admin' ? (
                <button
                  className="pill-btn pill-btn-black"
                  onClick={() => openForm('users')}
                >
                  <Plus size={14} />
                  Add User
                </button>
              ) : view === 'requests' ? (
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={() => openForm('requests')}
                >
                  <Plus size={14} />
                  Request Time Off
                </button>
              ) : view === 'payruns' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) ? (
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={() => setModal({ kind: 'wizard' })}
                >
                  <Plus size={14} />
                  New Payrun
                </button>
              ) : !['overview', 'employee', 'run', 'users'].includes(view) && currentUser.role !== 'Employee' ? (
                <button
                  className="pill-btn pill-btn-black"
                  disabled={!s}
                  onClick={() => openForm(view)}
                >
                  <Plus size={14} />
                  New Record
                </button>
              ) : null}
            </div>
          </div>

          {error && !modal && (
            <div className="p-3 bg-white border border-rose-200 rounded-2xl text-xs text-rose-800 shadow-2xs flex items-center justify-between">
              <span>{error}</span>
              <button className="font-semibold underline ml-2 text-rose-900" onClick={() => void load()}>Reload</button>
            </div>
          )}
          {message && !modal && (
            <div className="p-3 bg-white border border-emerald-200 rounded-2xl text-xs text-emerald-800 shadow-2xs font-medium">
              {message}
            </div>
          )}

          {/* ACCESS CONTROL CHECK: If route is unauthorized for current role */}
          {!hasAccess ? (
            <div className="workora-card text-center py-16">
              <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Restricted by RBAC Policy</h2>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Your role (<strong>{currentUser.role}</strong>) does not have permission to view or manage the <strong>{currentSection}</strong> module.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  className="pill-btn pill-btn-black"
                  onClick={() => navigate(defaultRouteForRole(currentUser.role).replace('#', ''))}
                >
                  Return to My Workspace
                </button>
              </div>
            </div>
          ) : !s ? (
            <div className="workora-card text-center py-16">
              <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3" />
              <h2 className="text-base font-semibold text-slate-900">{error ? 'Workspace connection unavailable' : 'Opening your workspace…'}</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error ? 'Verify that PostgreSQL is running, then reload.' : 'Loading database records.'}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => void load()}>Reload</Button>
            </div>
          ) : (
            <>
              {/* EMPLOYEE PORTAL HEADER CARD (if logged in as Employee) */}
              {currentUser.role === 'Employee' && (
                <div className="p-5 bg-linear-to-r from-slate-900 to-slate-800 rounded-2xl text-white mb-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar name={currentUser.name} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold">{currentUser.name}</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase">
                          Employee Portal
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {employee(currentUser.employeeId || '')?.position} · {employee(currentUser.employeeId || '')?.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-300 block">Today's Status</span>
                      <span className="text-sm font-bold text-white">
                        {signedIn ? `Checked In (${currentClock?.checkIn})` : currentClock?.checkOut ? 'Shift Completed' : 'Not Checked In'}
                      </span>
                    </div>
                    <button
                      className={'px-4 py-2 rounded-full font-bold text-xs transition-all shadow-xs ' + (signedIn ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white')}
                      disabled={busy || !!currentClock?.checkOut}
                      onClick={() => void act('clock', { employeeId: clockEmployeeId }, signedIn ? 'Checked out successfully.' : 'Checked in successfully.')}
                    >
                      {signedIn ? 'Clock Out' : currentClock?.checkOut ? 'Done Today' : 'Clock In'}
                    </button>
                  </div>
                </div>
              )}

              {/* OVERVIEW / DASHBOARD */}
              {view === 'overview' && (
                <Dashboard
                  s={s}
                  period={period}
                  setPeriod={setPeriod}
                  department={department}
                  setDepartment={setDepartment}
                  employeeType={employeeType}
                  setEmployeeType={setEmployeeType}
                  navigate={(v, id) => id && v === 'employees' ? navigate('employee', id) : navigate(v, id)}
                />
              )}

              {/* SYSTEM USERS MANAGEMENT (Admin Only) */}
              {view === 'users' && currentUser.role === 'Admin' && (
                <div className="workora-table-container">
                  <div className="table-tab-strip flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button className="table-tab-item active">
                        System Accounts ({usersList.length})
                      </button>
                      <button className="table-tab-muted">
                        Role Definitions
                      </button>
                    </div>
                    <div className="pill-search !py-1 !px-3">
                      <Search size={13} className="text-slate-400 shrink-0" />
                      <input
                        aria-label="Filter users"
                        placeholder="Search users…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <DataTable
                    rows={usersList.filter(u => !query || [u.name, u.email, u.roleName].some(x => String(x || '').toLowerCase().includes(query.toLowerCase())))}
                    columns={[
                      {
                        title: 'User',
                        render: (u: Row) => (
                          <div className="flex items-center gap-2.5">
                            <Avatar name={u.name} />
                            <div>
                              <span className="font-semibold text-slate-900 block text-xs">{u.name}</span>
                              <span className="text-[11px] text-slate-400 block">{u.email}</span>
                            </div>
                          </div>
                        )
                      },
                      {
                        title: 'Assigned Role',
                        render: (u: Row) => {
                          const roleName = u.roleName || u.roleId || 'Unknown';
                          const color = roleBadgeStyles[roleName] || 'bg-slate-100 text-slate-700';
                          return (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
                              {roleName}
                            </span>
                          );
                        }
                      },
                      {
                        title: 'Linked Employee',
                        render: (u: Row) => u.employeeId ? (
                          <span className="text-xs text-slate-700 font-medium">
                            {empName(u.employeeId)} <span className="text-slate-400">({employee(u.employeeId)?.department || 'Staff'})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None (System User)</span>
                        )
                      },
                      {
                        title: 'Status',
                        render: (u: Row) => (
                          <Badge value={u.active ? 'Active' : 'Deactivated'} />
                        )
                      },
                      {
                        title: 'Actions',
                        render: (u: Row) => (
                          <button
                            className="pill-btn !py-1 !px-2.5 text-xs font-semibold hover:bg-slate-100"
                            onClick={() => openForm('users', u)}
                          >
                            Edit Account
                          </button>
                        )
                      }
                    ]}
                  />
                </div>
              )}

              {/* Data Views (Cards or Execution Logs Table) */}
              {!['overview', 'employee', 'run', 'users'].includes(view) && (
                <div className="workora-table-container">
                  <div className="table-tab-strip flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <button className="table-tab-item active">
                        {titles[view] || 'Records'}
                      </button>
                      <button className="table-tab-muted">
                        Data Preview
                      </button>
                      <button className="table-tab-muted">
                        Variables
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="pill-search !py-1 !px-3">
                        <Search size={13} className="text-slate-400 shrink-0" />
                        <input
                          aria-label="Filter records"
                          placeholder="Filter records…"
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                        />
                      </div>
                      {view === 'employees' && (
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
                          <button
                            className={'px-2.5 py-1 rounded-full text-xs font-medium ' + (mode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')}
                            onClick={() => setMode('grid')}
                          >
                            <LayoutGrid size={13} />
                          </button>
                          <button
                            className={'px-2.5 py-1 rounded-full text-xs font-medium ' + (mode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')}
                            onClick={() => setMode('list')}
                          >
                            <List size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {view === 'employees' && (
                    mode === 'grid' ? (
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered(s.employees).map(e => (
                          <button
                            key={e.id}
                            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left flex flex-col justify-between"
                            onClick={() => navigate('employee', e.id)}
                          >
                            <div className="flex items-start justify-between">
                              <Avatar name={e.name} />
                              <Badge value={e.status} />
                            </div>
                            <div className="mt-3">
                              <h3 className="text-sm font-semibold text-slate-900">{e.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{e.position}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{e.email}</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-[11px] text-slate-700">{e.department}</span>
                              <span className="text-slate-400">{e.type}</span>
                            </div>
                          </button>
                        ))}
                        {!filtered(s.employees).length && <div className="col-span-full py-10 text-center text-xs text-slate-400">No employees match your search.</div>}
                      </div>
                    ) : (
                      <DataTable
                        rows={filtered(s.employees)}
                        columns={[
                          { title: 'Employee', render: e => <button className="flex items-center gap-2 text-left font-semibold text-slate-900 hover:underline" onClick={() => navigate('employee', e.id)}><Avatar name={e.name} />{e.name}</button> },
                          { title: 'Work email', render: e => e.email },
                          { title: 'Job position', render: e => e.position },
                          { title: 'Department', render: e => e.department },
                          { title: 'Status', render: e => <Badge value={e.status} /> }
                        ]}
                      />
                    )
                  )}

                  {view === 'contracts' && (
                    <DataTable
                      rows={filtered(s.contracts)}
                      columns={[
                        { title: 'Contract', render: c => <button className="font-semibold text-slate-900 hover:underline" onClick={() => ['Admin', 'HR Manager', 'HR Payroll Manager'].includes(currentUser.role) && openForm('contracts', c)}>{c.id.startsWith('c') && c.id.length < 5 ? 'CON/2026/' + String(+c.id.slice(1) + 1).padStart(4, '0') : c.id.slice(0, 8).toUpperCase()}</button> },
                        { title: 'Employee', render: cellEmployee },
                        { title: 'Start date', render: c => c.start },
                        { title: 'End date', render: c => c.end || 'Open-ended' },
                        { title: 'Monthly wage', render: c => money(c.wage) },
                        { title: 'Structure', render: c => structure(c.structureId) },
                        { title: 'Status', render: c => <Badge value={c.end && c.end < clockNow.toISOString().slice(0, 10) ? 'Expired' : c.start > clockNow.toISOString().slice(0, 10) ? 'Upcoming' : 'Running'} /> }
                      ]}
                    />
                  )}

                  {view === 'attendance' && (
                    <DataTable
                      rows={filtered(s.attendance).filter(a => !period || a.date.startsWith(period)).sort((a, b) => b.date.localeCompare(a.date))}
                      columns={[
                        { title: 'Employee', render: cellEmployee },
                        { title: 'Date', render: a => <button className="font-semibold text-slate-900 hover:underline" onClick={() => ['Admin', 'HR Manager'].includes(currentUser.role) && openForm('attendance', a)}>{a.date}</button> },
                        { title: 'Check-in', render: a => a.checkIn || '—' },
                        { title: 'Check-out', render: a => a.checkOut || '—' },
                        { title: 'Worked hours', render: a => hours(a).toFixed(2) },
                        { title: 'Status', render: a => <Badge value={attendanceStatus(a)} /> },
                        { title: 'Source', render: a => a.edited ? 'Manually edited' : 'Shift entry' }
                      ]}
                    />
                  )}

                  {view === 'requests' && (
                    <DataTable
                      rows={filtered(s.requests)}
                      columns={[
                        { title: 'Employee', render: cellEmployee },
                        { title: 'Time off type', render: r => leaveType(r.typeId)?.name || r.typeId },
                        { title: 'Start date', render: r => r.start },
                        { title: 'End date', render: r => r.end },
                        { title: 'Duration', render: r => `${r.duration} ${leaveType(r.typeId)?.unit || 'Days'}` },
                        { title: 'Reason', render: r => r.reason },
                        { title: 'Status', render: r => <Badge value={r.status} /> },
                        ...(currentUser.role === 'HR Manager' || currentUser.role === 'Admin' ? [{
                          title: 'Review',
                          render: (r: Row) => r.status === 'Pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                onClick={() => void act('approveLeave', { id: r.id }, 'Leave request approved.')}
                              >
                                Approve
                              </button>
                              <button
                                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200"
                                onClick={() => void act('refuseLeave', { id: r.id }, 'Leave request refused.')}
                              >
                                Refuse
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">{r.status}</span>
                          )
                        }] : [])
                      ]}
                    />
                  )}

                  {view === 'allocations' && (
                    <DataTable
                      rows={filtered(s.allocations)}
                      columns={[
                        { title: 'Employee', render: cellEmployee },
                        { title: 'Time off type', render: a => leaveType(a.typeId)?.name || a.typeId },
                        { title: 'Allocated amount', render: a => `${a.amount} ${leaveType(a.typeId)?.unit || 'Days'}` },
                        { title: 'Remaining balance', render: a => `${allocationBalance(s, a)} ${leaveType(a.typeId)?.unit || 'Days'}` },
                        { title: 'Validity', render: a => `${a.start} to ${a.end}` },
                        { title: 'Status', render: a => <Badge value={a.status} /> },
                        ...(currentUser.role === 'HR Manager' || currentUser.role === 'Admin' ? [{
                          title: 'Review',
                          render: (a: Row) => a.status === 'Pending' ? (
                            <button
                              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              onClick={() => void act('approveAllocation', { id: a.id }, 'Allocation approved.')}
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">{a.status}</span>
                          )
                        }] : [])
                      ]}
                    />
                  )}

                  {view === 'leaveTypes' && (
                    <DataTable
                      rows={s.leaveTypes}
                      columns={[
                        { title: 'Policy Name', render: t => <button className="font-semibold text-slate-900 hover:underline" onClick={() => currentUser.role !== 'Employee' && openForm('leaveTypes', t)}>{t.name}</button> },
                        { title: 'Unit', render: t => t.unit },
                        { title: 'Allocation Mode', render: t => t.requiresAllocation ? 'Requires Approved Pool' : 'Direct Request' }
                      ]}
                    />
                  )}

                  {view === 'schedules' && (
                    <DataTable
                      rows={s.schedules}
                      columns={[
                        { title: 'Schedule', render: sc => <button className="font-semibold text-slate-900 hover:underline" onClick={() => currentUser.role !== 'Employee' && openForm('schedules', sc)}>{sc.name}</button> },
                        { title: 'Working days', render: sc => sc.days?.join(', ') || 'Mon-Fri' },
                        { title: 'Hours', render: sc => `${sc.start} - ${sc.end} (${sc.breakHours}h break)` }
                      ]}
                    />
                  )}

                  {view === 'payruns' && (
                    <DataTable
                      rows={s.payruns.filter(r => !period || r.period === period)}
                      columns={[
                        { title: 'Payrun', render: r => <button className="font-semibold text-slate-900 hover:underline" onClick={() => navigate('payruns', r.id)}>{r.name}</button> },
                        { title: 'Period', render: r => r.period },
                        { title: 'Structure', render: r => structure(r.structureId) },
                        { title: 'Employees', render: r => r.employeeIds.length },
                        { title: 'Status', render: r => <Badge value={r.status} /> },
                        {
                          title: 'Actions',
                          render: (r: Row) => (
                            <div className="flex items-center gap-1.5">
                              {r.status === 'Draft' && ['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(currentUser.role) && (
                                <button
                                  className="pill-btn !py-1 !px-2.5 text-xs font-semibold"
                                  onClick={() => void act('compute', { id: r.id }, 'Payrun computed.')}
                                >
                                  Compute
                                </button>
                              )}
                              {r.status === 'Computed' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) && (
                                <button
                                  className="pill-btn !py-1 !px-2.5 text-xs font-semibold bg-blue-50 text-blue-800"
                                  onClick={() => void act('validate', { id: r.id }, 'Payrun validated.')}
                                >
                                  Validate
                                </button>
                              )}
                              {r.status === 'Validated' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) && (
                                <button
                                  className="pill-btn pill-btn-black !py-1 !px-2.5 text-xs font-semibold"
                                  onClick={() => void act('markPaid', { id: r.id }, 'Payrun marked paid.')}
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                className="pill-btn !py-1 !px-2 text-xs"
                                onClick={() => navigate('payruns', r.id)}
                              >
                                View Slips
                              </button>
                            </div>
                          )
                        }
                      ]}
                    />
                  )}

                  {view === 'payslips' && (
                    <DataTable
                      rows={allSlips.filter(p => !period || p.period === period)}
                      columns={[
                        { title: 'Employee', render: cellEmployee },
                        { title: 'Period', render: p => p.period },
                        { title: 'Worked days', render: p => p.workedDays },
                        { title: 'Gross salary', render: p => money(p.gross) },
                        { title: 'Deductions', render: p => money(p.deductions) },
                        { title: 'Net salary', render: p => <b className="text-slate-900 font-bold">{money(p.net)}</b> },
                        { title: 'Status', render: p => <Badge value={p.status || 'Paid'} /> },
                        {
                          title: 'Payslip',
                          render: (p: Row) => (
                            <button
                              className="inline-flex items-center gap-1 text-slate-900 hover:underline font-semibold text-xs"
                              onClick={() => setModal({ kind: 'slip', record: p })}
                            >
                              <FileText size={13} /> View
                            </button>
                          )
                        }
                      ]}
                    />
                  )}

                  {view === 'structures' && (
                    <DataTable
                      rows={s.structures}
                      columns={[
                        { title: 'Structure name', render: st => <button className="font-semibold text-slate-900 hover:underline" onClick={() => currentUser.role !== 'Employee' && openForm('structures', st)}>{st.name}</button> },
                        { title: 'Rule count', render: st => st.ruleIds.length },
                        { title: 'Active status', render: st => <Badge value={st.active ? 'Active' : 'Draft'} /> }
                      ]}
                    />
                  )}

                  {view === 'rules' && (
                    <DataTable
                      rows={s.rules.slice().sort((a, b) => a.sequence - b.sequence)}
                      columns={[
                        { title: 'Rule name', render: r => <button className="font-semibold text-slate-900 hover:underline" onClick={() => currentUser.role !== 'Employee' && openForm('rules', r)}>{r.name}</button> },
                        { title: 'Code', render: r => <code className="font-mono text-xs font-bold text-slate-700">{r.code}</code> },
                        { title: 'Category', render: r => <Badge value={r.category} /> },
                        { title: 'Sequence', render: r => r.sequence },
                        { title: 'Calculation method', render: r => r.method },
                        { title: 'Computation value', render: r => r.method === 'Fixed' ? money(r.value) : r.method === 'Percentage' ? `${r.value}% of ${r.base}` : r.expression }
                      ]}
                    />
                  )}
                </div>
              )}

              {/* EMPLOYEE DETAIL VIEW */}
              {view === 'employee' && activeEmployee && (
                <div className="space-y-6">
                  <div className="workora-card flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar name={activeEmployee.name} />
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-slate-900">{activeEmployee.name}</h2>
                          <Badge value={activeEmployee.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {activeEmployee.position} · {activeEmployee.department} · {activeEmployee.type}
                        </p>
                      </div>
                    </div>
                    {['Admin', 'HR Manager'].includes(currentUser.role) && (
                      <Button onClick={() => openForm('employees', activeEmployee)} className="rounded-full">
                        Edit Profile
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="workora-card space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Employment Details</h4>
                      <p className="text-xs text-slate-700"><strong>Work Email:</strong> {activeEmployee.email}</p>
                      <p className="text-xs text-slate-700"><strong>Phone:</strong> {activeEmployee.phone || '—'}</p>
                      <p className="text-xs text-slate-700"><strong>Location:</strong> {activeEmployee.location}</p>
                      <p className="text-xs text-slate-700"><strong>Manager:</strong> {activeEmployee.manager || '—'}</p>
                    </div>

                    <div className="workora-card space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Current Contract</h4>
                      {s.contracts.find(c => c.employeeId === activeEmployee.id) ? (
                        <>
                          <p className="text-xs text-slate-700"><strong>Monthly Wage:</strong> {money(s.contracts.find(c => c.employeeId === activeEmployee.id)?.wage || 0)}</p>
                          <p className="text-xs text-slate-700"><strong>Structure:</strong> {structure(s.contracts.find(c => c.employeeId === activeEmployee.id)?.structureId || '')}</p>
                          <p className="text-xs text-slate-700"><strong>Start Date:</strong> {s.contracts.find(c => c.employeeId === activeEmployee.id)?.start}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">No contract assigned.</p>
                      )}
                    </div>

                    <div className="workora-card space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Time Off Entitlements</h4>
                      {s.allocations.filter(a => a.employeeId === activeEmployee.id).map(a => (
                        <p key={a.id} className="text-xs text-slate-700">
                          <strong>{leaveType(a.typeId)?.name}:</strong> {allocationBalance(s, a)} / {a.amount} {leaveType(a.typeId)?.unit}
                        </p>
                      ))}
                      {!s.allocations.some(a => a.employeeId === activeEmployee.id) && (
                        <p className="text-xs text-slate-400">No active leave allocations.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PAYRUN DETAIL VIEW */}
              {view === 'run' && run && (
                <div className="space-y-6">
                  <div className="workora-card flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">{run.name}</h2>
                        <Badge value={run.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Period: {run.period} · Structure: {structure(run.structureId)} · {run.employeeIds.length} Employees Included
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {run.status === 'Draft' && ['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(currentUser.role) && (
                        <Button onClick={() => void act('compute', { id: run.id }, 'Payrun computed.')} className="rounded-full">
                          Compute Payslips
                        </Button>
                      )}
                      {run.status === 'Computed' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) && (
                        <Button onClick={() => void act('validate', { id: run.id }, 'Payrun validated.')} className="rounded-full bg-blue-600 hover:bg-blue-700">
                          Validate Payroll
                        </Button>
                      )}
                      {run.status === 'Validated' && ['Admin', 'HR Payroll Manager'].includes(currentUser.role) && (
                        <Button onClick={() => void act('markPaid', { id: run.id }, 'Payrun marked paid.')} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="workora-table-container">
                    <DataTable
                      rows={run.slips}
                      columns={runSlipColumns}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-3xl shadow-xl">
          <DialogTitle className="text-base font-bold text-slate-900 border-b pb-3">
            {modal?.kind === 'wizard' ? 'Generate New Payrun' : modal?.kind === 'slip' ? 'Employee Payslip' : modal?.kind === 'clock' ? 'Attendance Punch Clock' : modal?.collection ? titles[modal.collection] : 'Dialog'}
          </DialogTitle>
          <DialogDescription className="sr-only">Modal dialog for operations</DialogDescription>

          {modal?.kind === 'form' && modal.collection && (
            <RecordForm
              collection={modal.collection}
              initial={modal.record || defaults(modal.collection, s!, filterId || undefined)}
              s={s!}
              busy={busy}
              onSave={saveRecord}
              onCancel={() => setModal(null)}
            />
          )}

          {modal?.kind === 'wizard' && s && (
            <PayrunWizard
              s={s}
              busy={busy}
              onCreate={async (p) => {
                const result = await act('createPayrun', p, 'Payrun initialized.');
                if (result) setModal(null);
              }}
              onCancel={() => setModal(null)}
            />
          )}

          {modal?.kind === 'slip' && modal.record && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{empName(modal.record.employeeId)}</h3>
                  <p className="text-xs text-slate-400">{employee(modal.record.employeeId)?.position} · {employee(modal.record.employeeId)?.department}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-600 block">{modal.record.period}</span>
                  <span className="text-[11px] text-slate-400">{structure(modal.record.structureId)}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Days Worked</span>
                  <span className="font-semibold text-slate-800">{modal.record.workedDays}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Basic Salary</span>
                  <span className="font-semibold text-slate-800">{money(modal.record.basic)}</span>
                </div>

                {modal.record.lines?.map((line: any) => (
                  <div key={line.code} className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">{line.name} ({line.code})</span>
                    <span className={line.category === 'Deduction' ? 'text-rose-600 font-semibold' : 'text-slate-800 font-semibold'}>
                      {line.category === 'Deduction' ? '-' : ''}{money(line.amount)}
                    </span>
                  </div>
                ))}

                <div className="flex justify-between py-1 border-b border-slate-50 font-bold">
                  <span>Gross Salary</span>
                  <span>{money(modal.record.gross)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50 font-bold text-rose-600">
                  <span>Total Deductions</span>
                  <span>-{money(modal.record.deductions)}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center text-sm">
                <span>Net Disbursement</span>
                <span className="text-lg font-bold">{money(modal.record.net)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button className="pill-btn !py-1.5" onClick={() => setModal(null)}>Close</button>
                <button className="pill-btn pill-btn-black !py-1.5" onClick={() => window.print()}><Download size={13} /> Print / PDF</button>
              </div>
            </div>
          )}

          {modal?.kind === 'clock' && s && (
            <div className="space-y-4 text-center py-2">
              <div className="text-4xl font-extrabold tracking-tight text-slate-900">
                {clockNow.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-xs text-slate-400">
                Today · {clockNow.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long' })} · Asia/Kolkata
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {signedIn ? 'Checked in at ' + currentClock?.checkIn : currentClock?.checkOut ? 'Today’s shift completed' : 'You are not checked in'}
                </span>
                <Badge value={signedIn ? 'Present' : currentClock?.checkOut ? 'Completed' : 'Not checked in'} />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button className="pill-btn" onClick={() => { setModal(null); navigate('attendance'); }}>
                  View Attendance History
                </button>
                <button
                  className="pill-btn pill-btn-black"
                  disabled={busy || !!currentClock?.checkOut}
                  onClick={() => void act('clock', { employeeId: clockEmployeeId }, signedIn ? 'Checked out.' : 'Checked in.')}
                >
                  {signedIn ? 'Check out' : 'Check in'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── LOGIN SCREEN COMPONENT ───
function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: AppUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }
      onLoginSuccess(data.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const demoAccounts = [
    { role: 'Admin', email: 'admin@oxp.example', pass: 'admin123', desc: 'Full administration & user management' },
    { role: 'HR Payroll Manager', email: 'nisha@oxp.example', pass: 'payrollmgr123', desc: 'Full payroll compute, validate, pay & structures' },
    { role: 'HR Payroll User', email: 'payroll.user@oxp.example', pass: 'payroll123', desc: 'Operational payroll compute & payslips' },
    { role: 'HR Manager', email: 'sara@oxp.example', pass: 'hrmanager123', desc: 'Team directory, contracts & leave approvals' },
    { role: 'Employee', email: 'john@oxp.example', pass: 'employee123', desc: 'Self-service: Punch clock, time off & payslips' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2">
          <span className="size-3 rounded-full bg-slate-900" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">peoplepay360</h1>
        </div>
        <h2 className="mt-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Enterprise HR, Time-Off & Payroll System
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-3xl sm:px-10">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void performLogin(email, password);
            }}
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@oxp.example"
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <Input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-xl"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
            >
              {busy ? 'Verifying credentials…' : 'Sign in with Password'}
            </Button>
          </form>

          {/* Quick Demo Sign In Grid */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
              <span>Quick Role Test Logins</span>
              <span className="text-[10px] text-slate-400 font-normal">Click to sign in</span>
            </h3>

            <div className="space-y-2">
              {demoAccounts.map(acc => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    void performLogin(acc.email, acc.pass);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-slate-900">{acc.role}</span>
                      <span className="text-[10px] text-slate-400">{acc.email}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{acc.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-700" />
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-400 text-center mt-4">
              Self-registration is disabled. Accounts and roles are managed by System Administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAYRUN WIZARD COMPONENT ───
function PayrunWizard({ s, busy, onCreate, onCancel }: { s: Workspace; busy: boolean; onCreate: (p: Record<string, any>) => Promise<void>; onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [period, setPeriod] = useState('2026-10');
  const [structureId, setStructureId] = useState(s.structures[0]?.id || '');
  const [ids, setIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const eligible = s.employees.filter(e => {
    if (e.status !== 'Active' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return false;
    try {
      const c = activeContract(s, e.id, period);
      return c.structureId === structureId && !s.payruns.some(r => r.period === period && r.employeeIds.includes(e.id));
    } catch {
      return false;
    }
  });

  const toggle = (id: string, checked: boolean) => setIds(x => checked ? [...x, id] : x.filter(i => i !== id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-xs font-semibold pb-2 border-b border-slate-100">
        <span className={step === 1 ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400'}>01 · Scope & Period</span>
        <span className={step === 2 ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400'}>02 · Select Employees</span>
      </div>

      {step === 1 ? (
        <div className="space-y-3">
          <Field label="Salary Structure">
            <Picker label="Salary structure" value={structureId} onChange={setStructureId} options={s.structures.filter(st => st.active).map(st => ({ value: st.id, label: st.name }))} />
          </Field>
          <Field label="Payroll Month">
            <Input type="month" required aria-label="Payroll month" value={period} onChange={e => setPeriod(e.target.value)} className="h-9 rounded-xl" />
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
              <input aria-label="Search eligible employees" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search eligible employees…" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{ids.length} selected</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2">
            <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700">
              <Checkbox checked={eligible.length > 0 && ids.length === eligible.length} onCheckedChange={v => setIds(v ? eligible.map(e => e.id) : [])} />
              Select all eligible employees ({eligible.length})
            </label>
            {eligible.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).map(e => (
              <label key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-700">
                <Checkbox checked={ids.includes(e.id)} onCheckedChange={v => toggle(e.id, !!v)} />
                <Avatar name={e.name} />
                <span className="font-medium">{e.name}</span>
                <span className="text-[11px] text-slate-400 ml-auto">{e.department}{!e.bank ? ' · Bank missing' : ''}</span>
              </label>
            ))}
            {!eligible.length && <div className="py-6 text-center text-xs text-slate-400">No eligible employees found.</div>}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button className="pill-btn !py-1.5" onClick={step === 1 ? onCancel : () => setStep(1)}>{step === 1 ? 'Cancel' : 'Back'}</button>
        {step === 1 ? (
          <button className="pill-btn pill-btn-black !py-1.5" disabled={!structureId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)} onClick={() => { setIds([]); setStep(2); }}>Continue <ArrowUpRight size={13} /></button>
        ) : (
          <button className="pill-btn pill-btn-black !py-1.5" disabled={busy || !ids.length} onClick={() => void onCreate({ period, structureId, employeeIds: ids })}>{busy ? 'Creating…' : 'Create payrun'}</button>
        )}
      </div>
    </div>
  );
}
