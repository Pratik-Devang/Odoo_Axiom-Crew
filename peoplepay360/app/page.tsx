'use client';

import Image from 'next/image';
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
  ShieldAlert,
  AlertCircle,
  Users,
  Key,
  Mail,
  ChevronRight,
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
  monthEnd,
  scheduleRows,
  scheduleRowForDate,
  scheduleWeeklyHours,
  employeeSchedule,
} from '@/lib/domain';
import { Avatar, Badge, DataTable, Field, Picker, niceMonth, downloadCsv } from '@/components/peoplepay-ui';
import Dashboard from '@/components/payroll-dashboard';
import OverviewDashboard from '@/components/overview-dashboard';
import WorkingSchedules from '@/components/working-schedules';
import { EmployeeRosterList } from '@/components/dashboard/EmployeeRosterList';
import { getEmployeeRosterRows } from '@/lib/dashboard-calculations';
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
  kind: 'form' | 'request' | 'allocation' | 'wizard' | 'slip' | 'clock' | 'about' | 'userForm';
  collection?: string;
  record?: Row;
};

async function readApiResponse(response: Response): Promise<ApiBody> {
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

type ApiBody = Record<string, unknown>;

type SystemUser = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName?: string;
  employeeId?: string;
  active?: boolean;
};

type PayrunCreatePayload = {
  period: string;
  structureId: string;
  employeeIds: string[];
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function responseError(body: ApiBody, fallback: string) {
  return typeof body.error === 'string' ? body.error : fallback;
}


const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@oxp.example', password: 'admin123', desc: 'Full workspace & user management' },
  { role: 'HR Payroll Manager', email: 'nisha@oxp.example', password: 'payrollmgr123', desc: 'Author rules, payrun wizard, validate & mark paid' },
  { role: 'HR Payroll User', email: 'payroll.user@oxp.example', password: 'payroll123', desc: 'Review payruns, compute payslip calculations' },
  { role: 'HR Manager', email: 'sara@oxp.example', password: 'hrmanager123', desc: 'Employee profiles, contracts & leave approvals' },
  { role: 'Employee', email: 'john@oxp.example', password: 'employee123', desc: 'Self-service attendance, requests & payslips' },
];

const EMPLOYEE_QUICK_LOGINS = [
  { name: 'Aarav Mehta', position: 'Senior Payroll Manager', department: 'Finance', email: 'aarav.mehta@oxp.example' },
  { name: 'Abhishek Roy', position: 'Business Development Representative', department: 'Sales', email: 'abhishek.roy@oxp.example' },
  { name: 'Aditya Sen', position: 'Senior Backend Engineer', department: 'Engineering', email: 'aditya.sen@oxp.example' },
  { name: 'Ananya Deshmukh', position: 'HR Business Partner', department: 'HR', email: 'ananya.deshmukh@oxp.example' },
  { name: 'Ananya Iyer', position: 'Head of Product Design', department: 'Product', email: 'ananya.iyer@oxp.example' },
  { name: 'Anik Dutta', position: 'Cloud Infrastructure Intern', department: 'Engineering', email: 'anik.dutta@oxp.example' },
  { name: 'Arun Bhatia', position: 'Staff Backend Architect', department: 'Engineering', email: 'arun.bhatia@oxp.example' },
  { name: 'Bhavna Parekh', position: 'Client Solutions Consultant', department: 'Sales', email: 'bhavna.parekh@oxp.example' },
  { name: 'Chetan Bhagat', position: 'Technical Support Specialist', department: 'Support', email: 'chetan.bhagat@oxp.example' },
  { name: 'Deepak Chopra', position: 'Senior DevOps / SRE', department: 'Engineering', email: 'deepak.chopra@oxp.example' },
  { name: 'Dev Shah', position: 'Head of Enterprise Sales', department: 'Sales', email: 'dev.shah@oxp.example' },
  { name: 'Divya Sundaram', position: 'Frontend Engineer', department: 'Engineering', email: 'divya.sundaram@oxp.example' },
  { name: 'Gautam Singhania', position: 'HR Operations Specialist', department: 'HR', email: 'gautam.singhania@oxp.example' },
  { name: 'Ishaan Kapoor', position: 'Support Operations Manager', department: 'Support', email: 'ishaan.kapoor@oxp.example' },
  { name: 'John Dsouza', position: 'Frontend Lead Developer', department: 'Engineering', email: 'john.dsouza@oxp.example' },
  { name: 'Kabir Sethi', position: 'Software Engineering Intern', department: 'Engineering', email: 'kabir.sethi@oxp.example' },
  { name: 'Karthik Raja', position: 'Full Stack Engineer', department: 'Engineering', email: 'karthik.raja@oxp.example' },
  { name: 'Kavita Joshi', position: 'Recruiting Coordinator', department: 'HR', email: 'kavita.joshi@oxp.example' },
  { name: 'Kunal Kapoor', position: 'Regional Sales Manager (North)', department: 'Sales', email: 'kunal.kapoor@oxp.example' },
  { name: 'Manish Tiwari', position: 'Payroll Specialist', department: 'Finance', email: 'manish.tiwari@oxp.example' },
  { name: 'Maya Shah', position: 'Senior Account Executive', department: 'Sales', email: 'maya.shah@oxp.example' },
  { name: 'Meera Nambiar', position: 'Compensation & Benefits Analyst', department: 'Finance', email: 'meera.nambiar@oxp.example' },
  { name: 'Monika Sehgal', position: 'Client Care Associate', department: 'Support', email: 'monika.sehgal@oxp.example' },
  { name: 'Natasha Thomas', position: 'Visual Designer', department: 'Product', email: 'natasha.thomas@oxp.example' },
  { name: 'Naveen Kumar', position: 'QA Automation Engineer', department: 'Engineering', email: 'naveen.kumar@oxp.example' },
  { name: 'Neha Patel', position: 'Talent Acquisition Lead', department: 'HR', email: 'neha.patel@oxp.example' },
  { name: 'Nikhil Mathur', position: 'Helpdesk Analyst', department: 'Support', email: 'nikhil.mathur@oxp.example' },
  { name: 'Nisha Rao', position: 'Director of Finance & Accounts', department: 'Finance', email: 'nisha.rao@oxp.example' },
  { name: 'Pallavi Rao', position: 'Junior Frontend Developer', department: 'Engineering', email: 'pallavi.rao@oxp.example' },
  { name: 'Pooja Bhatt', position: 'Customer Success Associate', department: 'Support', email: 'pooja.bhatt@oxp.example' },
  { name: 'Pooja Hegde', position: 'Principal QA Engineer', department: 'Engineering', email: 'pooja.hegde@oxp.example' },
  { name: 'Prashant Verma', position: 'Principal Product Manager', department: 'Product', email: 'prashant.verma@oxp.example' },
  { name: 'Priya Nair', position: 'Customer Success Team Lead', department: 'Support', email: 'priya.nair@oxp.example' },
  { name: 'Rahul Bose', position: 'Junior Backend Developer', department: 'Engineering', email: 'rahul.bose@oxp.example' },
  { name: 'Rajesh Varma', position: 'Chief Executive Officer', department: 'Management', email: 'rajesh.varma@oxp.example' },
  { name: 'Ritu Kulkarni', position: 'Senior Staff Accountant', department: 'Finance', email: 'ritu.kulkarni@oxp.example' },
  { name: 'Rohan Patel', position: 'Engineering Director', department: 'Engineering', email: 'rohan.patel@oxp.example' },
  { name: 'Sameer Qureshi', position: 'Sales Operations Coordinator', department: 'Sales', email: 'sameer.qureshi@oxp.example' },
  { name: 'Sanya Mirza', position: 'Senior UX Researcher', department: 'Product', email: 'sanya.mirza@oxp.example' },
  { name: 'Sara Khan', position: 'Head of People & Culture', department: 'HR', email: 'sara.khan@oxp.example' },
  { name: 'Shreya Ghosh', position: 'Database Reliability Engineer', department: 'Engineering', email: 'shreya.ghosh@oxp.example' },
  { name: 'Shruti Bhatt', position: 'UI/UX Mobile Developer', department: 'Engineering', email: 'shruti.bhatt@oxp.example' },
  { name: 'Siddharth Roy', position: 'Accounts Payable Associate', department: 'Finance', email: 'siddharth.roy@oxp.example' },
  { name: 'Sneha Chawla', position: 'Cloud Security Specialist', department: 'Engineering', email: 'sneha.chawla@oxp.example' },
  { name: 'Sunita Menon', position: 'Chief Operating Officer', department: 'Management', email: 'sunita.menon@oxp.example' },
  { name: 'Tanvi Agarwal', position: 'People Operations Intern', department: 'HR', email: 'tanvi.agarwal@oxp.example' },
  { name: 'Tarun Saxena', position: 'Product Analyst', department: 'Product', email: 'tarun.saxena@oxp.example' },
  { name: 'Varun Reddy', position: 'Data Platform Engineer', department: 'Engineering', email: 'varun.reddy@oxp.example' },
  { name: 'Vikramaditya Rao', position: 'VP of Technology & Operations', department: 'Management', email: 'vikram.rao@oxp.example' },
  { name: 'Zoya Khan', position: 'Inbound Sales Associate', department: 'Sales', email: 'zoya.khan@oxp.example' }
].map(e => ({ ...e, password: 'welcome123' }));


const DEFAULT_LOGIN = DEMO_ACCOUNTS[0];

const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-rose-50 text-rose-700 border-rose-200',
  'HR Payroll Manager': 'bg-amber-50 text-amber-800 border-amber-200',
  'HR Payroll User': 'bg-blue-50 text-blue-700 border-blue-200',
  'HR Manager': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Employee: 'bg-slate-100 text-slate-700 border-slate-200',
};

function defaultRouteForRole(role: string): string {
  if (role === 'Employee') return 'attendance';
  if (role === 'HR Manager') return 'employees';
  if (role === 'HR Payroll User') return 'payruns';
  if (role === 'Admin') return 'users';
  return 'overview';
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
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Fixed' | 'Flexible' | 'Shift'>('All');
  const [modal, setModal] = useState<Modal | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockNow, setClockNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const todayIso = mounted && clockNow ? clockNow.toISOString().slice(0, 10) : '2026-09-05';

  // Authentication & RBAC states
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState(DEFAULT_LOGIN.email);
  const [loginPassword, setLoginPassword] = useState(DEFAULT_LOGIN.password);
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [loginSearch, setLoginSearch] = useState('');

  // Admin users state & unified view options
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [systemRoles, setSystemRoles] = useState<any[]>([]);
<<<<<<< HEAD
  const [selectedUserDrawer, setSelectedUserDrawer] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState<any>({
=======
  const [userViewMode, setUserViewMode] = useState<'grid' | 'list'>('list');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');
  const [selectedUserDrawer, setSelectedUserDrawer] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
>>>>>>> 3a023cce13993afb554109e9c016ec7086a445ab
  const [userFormData, setUserFormData] = useState<any>({
    id: '',
    name: '',
    email: '',
    roleId: 'employee',
    employeeId: '',
    password: '',
    active: true,
    department: 'Engineering',
    position: 'Team Member',
    phone: '+91 90000 10000',
    type: 'Full-time',
    manager: 'Sara Khan',
    location: 'Mumbai',
    scheduleId: 'sch1',
    bank: '',
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const body = await res.json();
        if (body?.user) {
          setCurrentUser(body.user);
          return body.user;
        }
      }
      setCurrentUser(null);
      return null;
    } catch {
      setCurrentUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const r = await fetch('/api/users', { cache: 'no-store' });
      if (r.ok) {
        const body = await r.json();
        setSystemUsers(Array.isArray(body.users) ? body.users : []);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  }, []);

  async function handleLogin(emailToUse?: string, passToUse?: string) {
    const email = (emailToUse ?? loginEmail).trim();
    const password = (passToUse ?? loginPassword).trim();
    if (!email || !password) {
      setLoginError('Please enter both work email and password.');
      return;
    }
    setLoginBusy(true);
    setLoginError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await readApiResponse(r);
      if (!r.ok) {
        throw new Error(responseError(data, 'Authentication failed.'));
      }
      const user = data.user as AppUser;
      setCurrentUser(user);
      setLoginEmail('');
      setLoginPassword('');
      await load();
      if (user.role === 'Admin') {
        await loadUsers();
      }
      const defRoute = defaultRouteForRole(user.role);
      navigate(defRoute);
    } catch (err: unknown) {
      setLoginError(errorMessage(err, 'Login failed.'));
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setCurrentUser(null);
    setS(null);
    setRevision(0);
    setLoginEmail(DEFAULT_LOGIN.email);
    setLoginPassword(DEFAULT_LOGIN.password);
    setView('overview');
    window.location.hash = '';
  }

  async function handleSaveUser(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userFormData),
      });
      const body = await readApiResponse(r);
      if (!r.ok) throw new Error(responseError(body, 'Failed to save user.'));
      await loadUsers();
      setMessage(userFormData.id ? 'User updated successfully.' : 'New user provisioned.');
      setModal(null);
    } catch (err: unknown) {
      setError(errorMessage(err, 'Unable to save user.'));
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setError('');
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const body = await readApiResponse(r);
      if (r.status === 401) {
        setCurrentUser(null);
        setS(null);
      }
      if (!r.ok) throw new Error(responseError(body, 'Unable to load the workspace.'));
      setS(body.data as Workspace);
      setRevision(Number(body.revision || 0));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    void checkAuth();
    void load();
    const timer = setInterval(() => setClockNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [checkAuth, load]);

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      void loadUsers();
    }
  }, [currentUser, loadUsers]);

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const [vRaw, id] = hash.split('/');
      let v = vRaw;
      if (v === 'admin' && id === 'users') {
        v = 'users';
      } else if (v.startsWith('payroll/')) {
        v = v.replace('payroll/', '');
        if (v === 'dashboard') v = 'overview';
      } else if (v === 'time-off') {
        v = 'requests';
      } else if ((v === 'employees' || v === 'employee' || v === 'admin/employees') && currentUser?.role === 'Admin') {
        v = 'users';
      }
      if (v && (titles[v] || v === 'overview' || v === 'employee' || v === 'run' || v === 'users' || v === 'schedules')) {
        setView(v);
        setActiveId(decodeURIComponent(id || ''));
        setFilterId('');
      }
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [currentUser]);

  function navigate(v: string, id?: string) {
    let resolvedView = v;
    if ((resolvedView === 'employees' || resolvedView === 'employee' || resolvedView === 'admin/employees') && currentUser?.role === 'Admin') {
      resolvedView = 'users';
    }
    let resolvedId = id || '';
    let newQuery = '';

    if (resolvedId.startsWith('dept:')) {
      const deptName = resolvedId.replace('dept:', '');
      setDepartment(deptName);
      newQuery = deptName;
      resolvedId = '';
    } else if (resolvedId.startsWith('stat:')) {
      const statName = resolvedId.replace('stat:', '');
      newQuery = statName === 'present' ? 'Present' : statName === 'late' ? 'Late' : statName === 'absent' ? 'Absent' : '';
      resolvedId = '';
    } else if (resolvedId.startsWith('period:')) {
      setPeriod(resolvedId.replace('period:', ''));
      resolvedId = '';
    }

    setView(resolvedView);
    setActiveId(resolvedId);
    setFilterId('');
    setQuery(newQuery);
    setModal(null);
    setError('');
    setMessage('');
    const targetHash = resolvedView === 'users' ? 'admin/users' : resolvedView === 'overview' ? 'payroll/dashboard' : resolvedView;
    window.history.replaceState(null, '', '#' + targetHash + (resolvedId ? '/' + encodeURIComponent(resolvedId) : ''));
  }

  function related(v: string, id: string) {
    navigate(v);
    setFilterId(id);
  }

  async function act(
    action: string,
    payload: Record<string, unknown> = {},
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
      if (r.status === 401) {
        setCurrentUser(null);
        setS(null);
      }
      if (!r.ok) throw new Error(responseError(b, 'Unable to save.'));
      const nextWorkspace = b.data as Workspace;
      setS(nextWorkspace);
      setRevision(Number(b.revision || 0));
      setMessage(success);
      return nextWorkspace;
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

  const deleteRecord = async () => {
    if (!modal?.collection || !modal.record?.id) return;
    const archived = modal.collection === 'employees';
    const result = await act(
      'delete',
      { collection: modal.collection, id: modal.record.id },
      archived ? 'Employee archived.' : 'Record deleted.'
    );
    if (result) setModal(null);
  };

  const sendPayslips = async (runId: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/payruns/${encodeURIComponent(runId)}/send`, { method: 'POST' });
      const body = await readApiResponse(response);
      if (!response.ok && response.status !== 207) throw new Error(responseError(body, 'Unable to send payslips.'));
      const sent = Number(body.sent || 0);
      const failed = Number(body.failed || 0);
      setMessage(`${sent} payslip${sent === 1 ? '' : 's'} sent${failed ? `; ${failed} failed` : ''}.`);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
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

  const canReviewLeave = (request: Row) => {
    const role = currentUser?.role;
    if (!role) return false;
    if (role === 'Admin') return true;
    const workflow = leaveType(request.typeId)?.approvalWorkflow || 'HR Approval';
    if (workflow === 'No Approval') return false;
    if (workflow === 'Manager Approval') return role === 'HR Manager';
    return ['HR Manager', 'HR Payroll Manager'].includes(role);
  };
  const canReviewAllocation = !!currentUser && ['Admin', 'HR Manager', 'HR Payroll Manager'].includes(currentUser.role);

  const currentClock =
    mounted && clockNow && s
      ? s.attendance.find(
          (a) => a.employeeId === currentUser?.employeeId && a.date === clockNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        )
      : null;
  const signedIn = !!currentClock?.checkIn && !currentClock?.checkOut;
  const allSlips = s?.payruns.flatMap((r) => r.slips.map((p: Row) => ({ ...p, runId: r.id, status: r.status }))) || [];

  const cellEmployee = (r: Row) => (
    <button
      className="flex items-center gap-2 text-left hover:underline cursor-pointer"
      onClick={() => {
        setActiveId(r.employeeId);
        navigate('employee', r.employeeId);
      }}
    >
      <Avatar name={empName(r.employeeId)} />
      <span>
        <span className="font-semibold text-slate-900 block leading-tight">{empName(r.employeeId)}</span>
        <span className="text-[11px] text-slate-400 block">{employee(r.employeeId)?.department}</span>
      </span>
    </button>
  );

  const attendanceStatus = (a: Row) => {
    if (!a.checkIn) return 'Absent';
    if (!a.checkOut) return 'Missing check-out';
    const schedule = s ? employeeSchedule(s, a.employeeId, a.date) : undefined;
    const expected = scheduleRowForDate(schedule, a.date)?.start || '09:00';
    return a.checkIn > expected ? 'Late' : 'Present';
  };

  const runSlipColumns = [
    { title: 'Employee', render: cellEmployee },
    { title: 'Recorded days', render: (p: Row) => p.workedDays },
    { title: 'Payable days', render: (p: Row) => p.scheduledDays > 0 ? p.payableDays : 'Recompute' },
    { title: 'Unpaid leave', render: (p: Row) => p.unpaidLeaveDays || 0 },
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
    const slipsToExport = currentUser?.role === 'Employee'
      ? allSlips.filter((p) => p.employeeId === currentUser.employeeId)
      : allSlips.filter((p) => p.period === period);

    downloadCsv('peoplepay-payroll.csv', [
      ['Period', 'Employee', 'Department', 'Gross', 'Deductions', 'Net', 'Status'],
      ...slipsToExport.map((p) => [
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

  /* ---------------------------------------------------------
     LOGIN SCREEN (Crextio Design System)
     --------------------------------------------------------- */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="size-8 text-slate-400 animate-spin mb-3" />
        <h2 className="text-sm font-semibold text-slate-800">Verifying secure session...</h2>
        <p className="text-xs text-slate-500 mt-1">Connecting to PeoplePay360 database</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#e5ded4] shadow-sm p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/60 shadow-2xs mb-1">
              <Image src="/favicon.png" alt="PeoplePay360" width={40} height={40} className="rounded-xl object-contain" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              peoplepay<span className="text-[#e6a817]">360</span>
            </h1>
            <p className="text-xs text-[#8a7a6d]">Sign in to access your role-based workspace</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* -- Employee Quick-Login Picker ----------------------- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setLoginDropdownOpen(o => !o); setLoginSearch(''); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#e5ded4] bg-[#faf8f5] hover:border-slate-400 hover:bg-white transition-all text-left cursor-pointer"
            >
              <span className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Users size={13} className="text-[#c99a2e]" />
                Quick Employee Login
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${loginDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {loginDropdownOpen && (() => {
              const q = loginSearch.toLowerCase();
              const filtered = EMPLOYEE_QUICK_LOGINS.filter(e =>
                !q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
              );
              const grouped = Array.from(new Set(filtered.map(e => e.department))).sort().map(dept => ({
                dept,
                employees: filtered.filter(e => e.department === dept),
              }));
              const DEPT_COLORS: Record<string, string> = {
                Executive: 'bg-purple-50 text-purple-700',
                Management: 'bg-purple-50 text-purple-700',
                Engineering: 'bg-blue-50 text-blue-700',
                Finance: 'bg-emerald-50 text-emerald-700',
                HR: 'bg-rose-50 text-rose-700',
                Marketing: 'bg-orange-50 text-orange-700',
                Product: 'bg-indigo-50 text-indigo-700',
                Sales: 'bg-amber-50 text-amber-800',
                Support: 'bg-teal-50 text-teal-700',
              };
              return (
                <div className="absolute z-50 top-full mt-1.5 left-0 right-0 bg-white border border-[#e5ded4] rounded-2xl shadow-lg overflow-hidden">
                  {/* Search bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-[#f0ece5] bg-[#faf8f5]">
                    <Search size={12} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={loginSearch}
                      onChange={e => setLoginSearch(e.target.value)}
                      placeholder="Search name, position or department..."
                      className="w-full text-xs outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                    />
                    {loginSearch && (
                      <button type="button" onClick={() => setLoginSearch('')} className="text-slate-400 hover:text-slate-600">
                        <XCircle size={12} />
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  <div className="max-h-64 overflow-y-auto">
                    {grouped.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-6">No matching employees</div>
                    ) : (
                      grouped.map(({ dept, employees: emps }) => (
                        <div key={dept}>
                          <div className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest ${DEPT_COLORS[dept] || 'bg-slate-50 text-slate-600'}`}>
                            {dept}
                          </div>
                          {emps.map(emp => (
                            <button
                              key={emp.email}
                              type="button"
                              onClick={() => {
                                setLoginEmail(emp.email);
                                setLoginPassword(emp.password);
                                setLoginDropdownOpen(false);
                                setLoginSearch('');
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#faf8f5] transition-colors text-left group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors shrink-0">
                                  {emp.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-800 leading-tight truncate">{emp.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{emp.position}</div>
                                </div>
                              </div>
                              <span className="text-[10px] text-[#c99a2e] font-semibold shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">Fill -&gt;</span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="px-3 py-1.5 border-t border-[#f0ece5] bg-[#faf8f5] text-[9px] text-slate-400 text-center">
                    All employees - password: <span className="font-mono font-semibold text-slate-500">welcome123</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. admin@oxp.example"
                  className="w-full text-xs outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="pill-search !py-2 w-full bg-slate-50 border border-slate-200 focus-within:border-slate-400 focus-within:bg-white transition-all">
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="********"
                  className="w-full text-xs outline-none bg-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full pill-btn pill-btn-black !py-2.5 justify-center text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {loginBusy ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-[#f0ece5]">
            <div className="text-[11px] font-semibold text-[#8a7a6d] uppercase tracking-wider text-center mb-3">
              Quick Switch / Demo Role Logins
            </div>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => void handleLogin(demo.email, demo.password)}
                  disabled={loginBusy}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#e5ded4] hover:border-slate-400 hover:bg-[#faf8f5] transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors">
                      {demo.role.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                        {demo.role}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${ROLE_STYLES[demo.role] || ''}`}>
                          Role
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{demo.desc}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#c99a2e] font-semibold group-hover:underline">
                    Sign In -&gt;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     SLOT GENERATORS FOR EACH VIEW (Crextio 3-Column Template)
     --------------------------------------------------------- */

  let pageTitle = 'People & Operations Workflow';
  let headerActions: React.ReactNode = null;
  let leftSlot: React.ReactNode = null;
  let centerContent: React.ReactNode = null;
  let rightSlot: React.ReactNode = null;
  let backAction: (() => void) | undefined = undefined;

  // RBAC Permission Check
  const hasAccess = canView(currentUser.role, view);

  if (!s) {
    centerContent = (
      <div className="workora-card text-center py-16">
        <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3" />
        <h2 className="text-base font-semibold text-slate-900">
          {error ? 'Workspace connection unavailable' : 'Opening your workspace...'}
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
  } else if (!hasAccess) {
    pageTitle = 'Access Restricted';
    centerContent = (
      <div className="workora-card text-center py-16 space-y-4 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-[#c99a2e]">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your current role <span className="font-semibold text-slate-800">{currentUser.role}</span> does not have authorization to view the <span className="font-semibold text-slate-800">{titles[view] || view}</span> section.
          </p>
        </div>
        <div className="pt-2">
          <button
            className="pill-btn pill-btn-black !py-2 cursor-pointer"
            onClick={() => navigate(defaultRouteForRole(currentUser.role))}
          >
            Return to Allowed Workspace
          </button>
        </div>
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
        {['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(currentUser.role) && (
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
        )}
      </>
    );
    const overviewDepartments = [...new Set(s.employees.map((e) => e.department))];
    const rosterRows = getEmployeeRosterRows(
      s,
      { period, department, employeeType },
      query
    );

    leftSlot = (
      <EmployeeRosterList
        rows={rosterRows}
        departments={overviewDepartments}
        department={department}
        employeeType={employeeType}
        search={query}
        activeEmployeeId={activeId}
        onSearchChange={setQuery}
        onDepartmentChange={setDepartment}
        onEmployeeTypeChange={setEmployeeType}
        onSelectEmployee={(id) => {
          setActiveId(id);
          navigate('employee', id);
        }}
        initials={initials}
      />
    );

    centerContent = (
      <Dashboard
      <OverviewDashboard
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
        {['Admin', 'HR Manager'].includes(currentUser.role) && (
          <button className="pill-btn pill-btn-black" onClick={() => openForm('employees')}>
            <Plus size={14} />
            New Employee
          </button>
        )}
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
          subtitle={`${activeEmp.position} - ${activeEmp.department}`}
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
              meta={`${sched?.start || '09:00'} - ${sched?.end || '18:00'}`}
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
  } else if (view === 'schedules') {
    pageTitle = activeId ? (activeId === 'new' ? 'New Working Schedule' : 'Schedule Pattern') : 'Working Schedules';
    headerActions = !activeId ? (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Box */}
        <div className="pill-search !py-1 w-56 bg-white border border-[#e5ded4]">
          <Search size={13} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search schedules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-[#faf7f3] border border-[#e5ded4] rounded-xl px-2.5 py-1">
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-[#faf7f3] border border-[#e5ded4] rounded-xl px-2.5 py-1">
          <span>Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Fixed">Fixed</option>
            <option value="Flexible">Flexible</option>
            <option value="Shift">Shift</option>
          </select>
        </div>

        {/* + New Schedule Button */}
        <button
          className="pill-btn pill-btn-black !h-8 !px-3.5 !text-xs cursor-pointer shadow-sm"
          onClick={() => navigate('schedules', 'new')}
        >
          <Plus size={13} />
          New Schedule
        </button>

        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer text-slate-500 hover:text-slate-900"
            onClick={() => navigate('contracts')}
          >
            Contracts
          </button>
          <button
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer bg-white text-slate-900 shadow-2xs"
            onClick={() => navigate('schedules')}
          >
            Schedules
          </button>
        </div>
        
      </div>
    ) : null;

    centerContent = (
      <WorkingSchedules
        s={s}
        activeId={activeId}
        onNavigate={navigate}
        query={query}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        onSaveSchedule={async (record) => {
          await act('save', { collection: 'schedules', record }, 'Working schedule saved.');
        }}
        onDeleteSchedule={async (id) => {
          await act('delete', { collection: 'schedules', id }, 'Working schedule deleted.');
        }}
        busy={busy}
      />
    );
  } else if (view === 'contracts') {
    pageTitle = 'Employment Contracts';
    headerActions = (
      <>
        <button className="pill-btn" onClick={exportPayroll}>
          <Download size={14} />
          Export
        </button>
        <button className="pill-btn pill-btn-black" onClick={() => openForm('contracts')}>
          <Plus size={14} />
          New Contract
        </button>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer bg-white text-slate-900 shadow-2xs"
            onClick={() => navigate('contracts')}
          >
            Contracts
          </button>
          <button
            className="px-3 py-1 rounded-full text-xs font-medium cursor-pointer text-slate-500"
            onClick={() => navigate('schedules')}
          >
            Schedules
          </button>
        </div>
      </>
    );

    const filteredContracts = filtered(s.contracts);
    const activeContractRecord = s.contracts.find((c) => c.id === activeId) || filteredContracts[0];

    centerContent = (
      <div className="workora-table-container">
        <div className="table-tab-strip">
          <button className="table-tab-item active">Contracts ({s.contracts.length})</button>
        </div>
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
            <DetailRow label="Employee Department" value={emp?.department || '-'} />
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
    pageTitle = currentUser.role === 'Employee' ? 'My Attendance & Shifts' : 'Attendance & Shifts';
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
        <button
          className="pill-btn pill-btn-black"
          onClick={() => {
            if (currentUser.role === 'Employee') {
              setModal({ kind: 'clock' });
            } else {
              openForm('attendance');
            }
          }}
        >
          <Clock3 size={14} />
          {currentUser.role === 'Employee' ? 'Check In / Out' : 'New Entry'}
        </button>
      </>
    );

    // Filter attendance for Employee role to self only
    const employeePool = currentUser.role === 'Employee' && currentUser.employeeId
      ? s.employees.filter((e) => e.id === currentUser.employeeId)
      : s.employees;

    const activeEmp = employee(activeId) || employeePool[0];

    const baseAttendance = currentUser.role === 'Employee' && currentUser.employeeId
      ? s.attendance.filter((a) => a.employeeId === currentUser.employeeId)
      : s.attendance;

    const filteredAttendance = baseAttendance
      .filter((a) => {
        const matchesEmpFilter = !filterId || a.employeeId === filterId;
        const matchesPeriod = !period || a.date.startsWith(period);
        const emp = employee(a.employeeId);
        const matchesDept = department === 'All' || emp?.department === department;
        const status = attendanceStatus(a);
        const hoursWorked = hours(a);
        const matchesQuery =
          !query ||
          [emp?.name, emp?.department, a.date, status].some((x) =>
            String(x || '').toLowerCase().includes(query.toLowerCase())
          ) ||
          (query.toLowerCase() === 'over9' && hoursWorked > 9);
        return matchesEmpFilter && matchesPeriod && matchesDept && matchesQuery;
      })
      .sort((a, b) => b.date.localeCompare(a.date));

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
            { title: 'Check-in', render: (a) => a.checkIn || '-' },
            { title: 'Check-out', render: (a) => a.checkOut || '-' },
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
            <DetailRow label="Schedule Type" value={sched?.type || 'Fixed'} />
            <DetailRow label="Weekly Hours" value={`${scheduleWeeklyHours(sched).toFixed(1)} hours`} />
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
    pageTitle = currentUser.role === 'Employee' ? 'My Time Off Requests' : 'Time Off & Leave Management';
    headerActions = (
      <>
        {currentUser.role !== 'Employee' && (
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
        )}
        <button
          className="pill-btn pill-btn-black"
          onClick={() => {
            if (currentUser.role === 'Employee') {
              openForm('requests', defaults('requests', s, currentUser.employeeId));
            } else {
              openForm(view);
            }
          }}
        >
          <Plus size={14} />
          {view === 'requests' ? 'New Request' : view === 'allocations' ? 'New Allocation' : 'New Policy'}
        </button>
      </>
    );

    const baseRequests = currentUser.role === 'Employee' && currentUser.employeeId
      ? s.requests.filter((r) => r.employeeId === currentUser.employeeId)
      : s.requests;

    const filteredRequests = filtered(baseRequests);
    const activeReq = baseRequests.find((r) => r.id === activeId) || filteredRequests[0];

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
              { title: 'Dates', render: (r) => r.start + ' - ' + r.end },
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
              { title: 'Validity', render: (r) => r.start + ' - ' + r.end },
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
              { title: 'Approval', render: (r) => r.approvalWorkflow || 'HR Approval' },
              { title: 'Payroll', render: (r) => r.payrollImpact || 'Paid' },
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
            <DetailRow label="Duration" value={`${activeReq.duration} ${leaveType(activeReq.typeId)?.unit?.toLowerCase() || 'days'}`} />
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

          <DetailSection title="APPROVAL STATUS">
            {activeReq.status === 'Pending' ? (
              canReviewLeave(activeReq) ? (
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
                <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-800 border border-amber-200 text-center">
                  Pending {leaveType(activeReq.typeId)?.approvalWorkflow || 'HR Approval'}.
                </div>
              )
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
    pageTitle = view === 'run' ? run?.name || 'Payrun Workflow' : currentUser.role === 'Employee' ? 'My Payslips' : 'Payroll Management';
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
        {['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(currentUser.role) && (
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
        )}
      </>
    );

    const activeRun = s.payruns.find((r) => r.id === activeId) || s.payruns[0];

    leftSlot = currentUser.role !== 'Employee' ? (
      <MasterList
        title="Payruns"
        count={s.payruns.length}
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search payruns..."
      >
        {s.payruns.map((r) => {
          const isSel = r.id === activeRun?.id;
          const totalNet = r.slips.reduce((n: number, p: Row) => n + p.net, 0);
          return (
            <MasterCard
              key={r.id}
              avatar="PR"
              title={r.name}
              subtitle={`${niceMonth(r.period)} - ${r.employeeIds.length} staff`}
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
    ) : null;

    if (view === 'run' && run) {
      centerContent = (
        <div className="space-y-4">
          <div className="workora-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">{run.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Disbursement workflow for {run.period}</p>
              </div>
              <div className="flex items-center gap-1 bg-[#fcfbf9] p-1 rounded-xl border border-[#e5ded4]">
                {(['Draft', 'Computed', 'Validated', 'Paid'] as const).map((st, idx) => {
                  const isCurrent = run.status === st;
                  const isPast = ['Draft', 'Computed', 'Validated', 'Paid'].indexOf(run.status) >= idx;
                  return (
                    <div key={st} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-[10px] text-slate-300">-&gt;</span>}
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                          isCurrent
                            ? 'bg-[#1a1a1a] text-white shadow-2xs'
                            : isPast
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'text-slate-400'
                        }`}
                      >
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400">Period</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">
                  {run.period + '-01'} - {monthEnd(run.period)}
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

            {(() => {
              const runWarns = warnings(s, run);
              if (!runWarns.length) return null;
              return (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle size={14} /> Advisory Payroll Notices ({runWarns.length}):
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5 pl-1">
                    {runWarns.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                className={`pill-btn !py-1.5 cursor-pointer ${
                  run.status === 'Draft' ? 'pill-btn-black' : ''
                }`}
                disabled={busy || !['Draft', 'Computed'].includes(run.status)}
                onClick={() => void act('compute', { id: run.id }, 'Payslips computed.')}
              >
                <RefreshCw size={13} /> Compute Slips
              </button>
              <button
                className={`pill-btn !py-1.5 cursor-pointer ${
                  run.status === 'Computed' ? 'pill-btn-black' : ''
                }`}
                disabled={busy || run.status !== 'Computed' || currentUser.role === 'HR Payroll User'}
                title={currentUser.role === 'HR Payroll User' ? 'Requires HR Payroll Manager authorization' : ''}
                onClick={() => void act('validate', { id: run.id }, 'Payrun validated.')}
              >
                <Check size={13} /> Validate Run
              </button>
              <button
                className={`pill-btn !py-1.5 cursor-pointer ${
                  run.status === 'Validated' ? 'pill-btn-black' : ''
                }`}
                disabled={busy || run.status !== 'Validated' || currentUser.role === 'HR Payroll User'}
                title={currentUser.role === 'HR Payroll User' ? 'Requires HR Payroll Manager authorization' : ''}
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
              {['Admin', 'HR Payroll Manager'].includes(currentUser.role) && (
                <button
                  className="pill-btn !py-1.5 cursor-pointer"
                  disabled={busy || !run.slips.length || !['Validated', 'Paid'].includes(run.status)}
                  onClick={() => void sendPayslips(run.id)}
                >
                  <Mail size={13} /> {busy ? 'Sending...' : 'Send Payslips'}
                </button>
              )}
              {['Admin', 'HR Payroll Manager', 'HR Payroll User'].includes(currentUser.role) &&
                ['Draft', 'Computed'].includes(run.status) && (
                  <button
                    className="pill-btn !py-1.5 cursor-pointer text-rose-600"
                    disabled={busy}
                    onClick={async () => {
                      if (!window.confirm('Delete this unfinished payrun?')) return;
                      const result = await act('delete', { collection: 'payruns', id: run.id }, 'Payrun deleted.');
                      if (result) navigate('payruns');
                    }}
                  >
                    Delete Payrun
                  </button>
                )}
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
                { title: 'Period', render: (r) => r.period + '-01 - ' + monthEnd(r.period) },
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
              rows={filtered(allSlips).filter((p) => {
                const matchesPeriod = !period || p.period === period;
                const emp = employee(p.employeeId);
                const matchesDept = department === 'All' || emp?.department === department;
                return matchesPeriod && matchesDept;
              })}
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
                  render: (r) =>
                    currentUser.role === 'HR Payroll User' ? (
                      <span className="font-semibold text-slate-900">{r.name}</span>
                    ) : (
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
                  render: (r) =>
                    currentUser.role === 'HR Payroll User' ? (
                      <span className="font-semibold text-slate-900">{r.name}</span>
                    ) : (
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

    if (activeRun && currentUser.role !== 'Employee') {
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
  } else if (view === 'users') {
    pageTitle = 'System Users & Administration';
    headerActions = (
      <>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200">
          <button
            className={
              'px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (userViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => setUserViewMode('grid')}
            title="Kanban / Card grid"
          >
            <LayoutGrid size={13} />
          </button>
          <button
            className={
              'px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ' +
              (userViewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500')
            }
            onClick={() => setUserViewMode('list')}
            title="Tabular / List view"
          >
            <List size={13} />
          </button>
        </div>

        <div className="pill-search !py-1.5 w-56 bg-white border border-[#e5ded4]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Filter accounts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <Picker
          label="Role"
          value={userRoleFilter}
          onChange={setUserRoleFilter}
          options={['All', 'Admin', 'HR Payroll Manager', 'HR Payroll User', 'HR Manager', 'Employee']}
        />

        <button
          className="pill-btn pill-btn-black"
          onClick={() => {
            setUserFormData({
              id: '',
              name: '',
              email: '',
              roleId: 'employee',
              employeeId: '',
              password: '',
              active: true,
              department: 'Engineering',
              position: 'Team Member',
              phone: '+91 90000 10000',
              type: 'Full-time',
              manager: 'Sara Khan',
              location: 'Mumbai',
              scheduleId: 'sch1',
              bank: '',
            });
            setModal({ kind: 'userForm' });
          }}
        >
          <Plus size={14} /> New User
        </button>
      </>
    );

    const filteredUsers = systemUsers.filter(
      (u) =>
        (userRoleFilter === 'All' || (u.roleName || u.roleId).toLowerCase().includes(userRoleFilter.toLowerCase())) &&
        (!query ||
          [u.name, u.email, u.roleName, u.roleId, u.department, u.position].some((x) =>
            String(x || '').toLowerCase().includes(query.toLowerCase())
          ))
    );

    centerContent = userViewMode === 'grid' ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            onClick={() => setSelectedUserDrawer(u)}
            className="workora-card hover:border-slate-400 hover:shadow-md transition-all cursor-pointer p-4 space-y-3 bg-white rounded-2xl border border-[#e5ded4]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{u.name}</h3>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${ROLE_STYLES[u.roleName || ''] || 'bg-slate-100 text-slate-700'}`}>
                {u.roleName || u.roleId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Department</span>
                <span className="font-semibold text-slate-800">{u.department || 'Engineering'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Position</span>
                <span className="font-semibold text-slate-800">{u.position || 'Team Member'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${u.active ? 'text-emerald-700' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                {u.active ? 'Active Account' : 'Deactivated'}
              </span>
              <span className="text-xs text-[#c99a2e] font-semibold hover:underline">Inspect →</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <DataTable
        rows={filteredUsers}
        onSelect={(u) => setSelectedUserDrawer(u)}
        columns={[
          {
            title: 'Account User',
            render: (u) => (
              <div className="flex items-center gap-2.5">
                <Avatar name={u.name} />
                <div>
                  <span className="font-semibold text-slate-900 block">{u.name}</span>
                  <span className="text-[11px] text-slate-400">{u.email}</span>
                </div>
              </div>
            ),
          },
          {
            title: 'System Role',
            render: (u) => (
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${ROLE_STYLES[u.roleName || ''] || 'bg-slate-100 text-slate-700'}`}>
                {u.roleName || u.roleId}
              </span>
            ),
          },
          {
            title: 'Department',
            render: (u) => u.department || 'Engineering',
          },
          {
            title: 'Position',
            render: (u) => u.position || 'Team Member',
          },
          {
            title: 'Status',
            render: (u) => <Badge value={u.active ? 'Active' : 'Archived'} />,
          },
          {
            title: 'Actions',
            render: (u) => (
              <button
                className="text-xs font-semibold text-[#c99a2e] hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUserDrawer(u);
                }}
              >
                View Details →
              </button>
            ),
          },
        ]}
      />
    );
  }

  if (!mounted || !s) {
    return (
      <PageShell
        currentView={view}
        onNavigate={navigate}
        title="PeoplePay360"
        badgeText={error ? 'Offline' : 'Opening...'}
        error={error}
        message={message}
        onReload={() => void load()}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        <div className="workora-card text-center py-20 bg-white rounded-2xl border border-[#e5ded4] shadow-2xs max-w-lg mx-auto">
          {error ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Workspace Unavailable</h2>
                <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Please verify that the database is accessible and reload.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  className="pill-btn pill-btn-black !py-2 cursor-pointer"
                  onClick={() => {
                    setError('');
                    void load();
                  }}
                >
                  Retry Connection
                </button>
                <button
                  className="pill-btn !py-2 cursor-pointer"
                  onClick={() => void handleLogout()}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <>
              <RefreshCw className="size-8 text-slate-400 mx-auto animate-spin mb-3" />
              <h2 className="text-base font-semibold text-slate-900">Opening your workspace...</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Loading employees, attendance, and payroll records.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-full text-xs"
                onClick={() => void load()}
              >
                Reload
              </Button>
            </>
          )}
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
        currentUser={currentUser}
        onLogout={handleLogout}
        onClockClick={() => setModal({ kind: 'clock' })}
        onAboutClick={() => setModal({ kind: 'about' })}
        onNotificationClick={() => setMessage('Workspace synchronized with live database.')}
        error={error}
        message={message}
        onReload={() => void load()}
      >
        {centerContent}
      </PageShell>

      {/* ─── Slide-Over Right Drawer Overlay for Users ─── */}
      {selectedUserDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedUserDrawer(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 py-4">
            <div className="w-screen max-w-md bg-white border border-[#e5ded4] rounded-l-3xl shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-250">
              
              {/* Profile Header (Centered Avatar & Details matching uploaded design) */}
              <div className="p-6 pb-4 bg-white relative border-b border-[#f0ece5] text-center shrink-0">
                <button
                  onClick={() => setSelectedUserDrawer(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Close Drawer"
                >
                  <XCircle size={20} />
                </button>

                <div className="w-20 h-20 rounded-full bg-[#1a1a1a] text-white text-2xl font-bold flex items-center justify-center border-4 border-[#f7f4ee] shadow-sm mx-auto mb-2.5">
                  {initials(selectedUserDrawer.name)}
                </div>

                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {selectedUserDrawer.name}
                </h2>

                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedUserDrawer.email.split('@')[0]} · {selectedUserDrawer.department || 'Engineering'}
                </p>

                <div className="flex justify-center mt-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold border ${
                    selectedUserDrawer.active 
                      ? 'bg-[#f0fdf4] text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedUserDrawer.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {selectedUserDrawer.active ? 'Active' : 'Deactivated'}
                  </span>
                </div>
              </div>

              {/* Body with Collapsible Accordion Dropdowns */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
                
                {/* 1. BASIC INFORMATION (Collapsible) */}
                <details className="group border border-[#e5ded4] rounded-2xl bg-[#faf8f5]/60 overflow-hidden text-xs" open>
                  <summary className="flex items-center justify-between px-4 py-3 bg-[#f5efe6] hover:bg-[#ebdcc8]/60 cursor-pointer font-bold text-xs text-slate-800 transition-colors select-none">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="size-4 text-[#c99a2e] transition-transform duration-200 group-open:rotate-180" />
                      BASIC INFORMATION
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide group-open:hidden">Expand</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide hidden group-open:inline">Collapse</span>
                  </summary>

                  <div className="p-4 space-y-2.5 border-t border-[#e5ded4] bg-white">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Department</span>
                      <span className="text-xs text-slate-900 font-bold">{selectedUserDrawer.department || 'Engineering'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Manager</span>
                      <span className="text-xs text-slate-900 font-bold">{selectedUserDrawer.manager || 'Sara Khan'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Work Schedule</span>
                      <button
                        type="button"
                        onClick={() => {
                          const schedId = selectedUserDrawer.scheduleId || 'sch1';
                          setSelectedUserDrawer(null);
                          navigate('schedules', schedId);
                        }}
                        className="text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                        title="Click to view working schedule"
                      >
                        {selectedUserDrawer.scheduleName || '40 Hours / Week'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Location</span>
                      <span className="text-xs text-slate-900 font-bold">{selectedUserDrawer.location || 'Mumbai'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-xs text-slate-400 font-medium">Employee Type</span>
                      <span className="text-xs text-slate-900 font-bold">{selectedUserDrawer.type || 'Full-time'}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-400 font-medium">Bank Reference</span>
                      <span className="text-xs text-slate-900 font-bold font-mono">{selectedUserDrawer.bank || 'egshhdasf'}</span>
                    </div>
                  </div>
                </details>

                {/* 2. DOCUMENTS & CONTRACTS (Collapsible) */}
                <details className="group border border-[#e5ded4] rounded-2xl bg-[#faf8f5]/60 overflow-hidden text-xs">
                  <summary className="flex items-center justify-between px-4 py-3 bg-[#f5efe6] hover:bg-[#ebdcc8]/60 cursor-pointer font-bold text-xs text-slate-800 transition-colors select-none">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="size-4 text-[#c99a2e] transition-transform duration-200 group-open:rotate-180" />
                      DOCUMENTS & CONTRACTS
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide group-open:hidden">Expand</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide hidden group-open:inline">Collapse</span>
                  </summary>

                  <div className="p-4 space-y-2.5 border-t border-[#e5ded4] bg-white">
                    <div 
                      className="rounded-2xl border border-[#e8e2d8] bg-[#fcfbfa] p-3 flex items-center justify-between hover:bg-[#f7f4ee] cursor-pointer transition-colors shadow-2xs"
                      onClick={() => { setSelectedUserDrawer(null); navigate('contracts'); }}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="size-4 text-[#8a7a6d]" />
                        <span className="text-xs font-bold text-slate-900">Create employment contract</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">Draft <ChevronRight size={13} /></span>
                    </div>

                    <div 
                      className="rounded-2xl border border-[#e8e2d8] bg-[#fcfbfa] p-3 flex items-center justify-between hover:bg-[#f7f4ee] cursor-pointer transition-colors shadow-2xs"
                      onClick={() => { setSelectedUserDrawer(null); navigate('schedules'); }}
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="size-4 text-[#8a7a6d]" />
                        <span className="text-xs font-bold text-slate-900">Standard workweek...</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">09:00 – 18:00 <ChevronRight size={13} /></span>
                    </div>
                  </div>
                </details>

                {/* 3. STATISTICS & ATTENDANCE (Collapsible) */}
                <details className="group border border-[#e5ded4] rounded-2xl bg-[#faf8f5]/60 overflow-hidden text-xs">
                  <summary className="flex items-center justify-between px-4 py-3 bg-[#f5efe6] hover:bg-[#ebdcc8]/60 cursor-pointer font-bold text-xs text-slate-800 transition-colors select-none">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="size-4 text-[#c99a2e] transition-transform duration-200 group-open:rotate-180" />
                      STATISTICS & ATTENDANCE
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide group-open:hidden">Expand</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide hidden group-open:inline">Collapse</span>
                  </summary>

                  <div className="p-4 space-y-3 border-t border-[#e5ded4] bg-white">
                    <StatBar
                      label="Shift Attendance Rate"
                      value={92}
                      displayValue="92%"
                      variant="gold"
                    />
                    <StatBar
                      label="Approved Leave Pool"
                      value={80}
                      displayValue="16 days"
                      variant="green"
                    />
                  </div>
                </details>

                {/* 4. ACCOUNT PERMISSIONS & RESPONSIBILITIES (Collapsible) */}
                <details className="group border border-[#e5ded4] rounded-2xl bg-[#faf8f5]/60 overflow-hidden text-xs">
                  <summary className="flex items-center justify-between px-4 py-3 bg-[#f5efe6] hover:bg-[#ebdcc8]/60 cursor-pointer font-bold text-xs text-slate-800 transition-colors select-none">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="size-4 text-[#c99a2e] transition-transform duration-200 group-open:rotate-180" />
                      ACCOUNT PERMISSIONS
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide group-open:hidden">Expand</span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide hidden group-open:inline">Collapse</span>
                  </summary>

                  <div className="p-4 space-y-3 border-t border-[#e5ded4] bg-white">
                    <DetailRow label="Role Level" value={selectedUserDrawer.roleName || selectedUserDrawer.roleId} />
                    <DetailRow
                      label="Access Scope"
                      value={
                        selectedUserDrawer.roleId === 'admin'
                          ? 'Universal Control'
                          : selectedUserDrawer.roleId === 'employee'
                          ? 'Self-service Portal'
                          : 'Department Operations'
                      }
                    />
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed mt-2">
                      {selectedUserDrawer.roleId === 'admin'
                        ? 'Full system governance, security settings, user provisioning, role assignments, and all HR/Payroll modules.'
                        : selectedUserDrawer.roleId === 'payroll_manager'
                        ? 'Authorized for payroll run creation, salary structures, rule authoring, validation, and final disbursement.'
                        : selectedUserDrawer.roleId === 'payroll_user'
                        ? 'Authorized for contract review, calculating payslips, and computing draft payruns.'
                        : selectedUserDrawer.roleId === 'hr_manager'
                        ? 'Authorized for employee profile creation, contract administration, attendance oversight, and approving time-off.'
                        : 'Self-service access to check-in attendance, view personal time off requests, and view generated monthly payslips.'}
                    </p>
                  </div>
                </details>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[#e5ded4] bg-[#faf8f5] flex items-center justify-between shrink-0">
                <button
                  className="pill-btn pill-btn-black !py-2 justify-center text-xs font-semibold cursor-pointer"
                  onClick={() => {
                    const targetUser = selectedUserDrawer;
                    setSelectedUserDrawer(null);
                    setUserFormData({
                      id: targetUser.id,
                      name: targetUser.name,
                      email: targetUser.email,
                      roleId: targetUser.roleId,
                      employeeId: targetUser.employeeId || '',
                      password: '',
                      active: targetUser.active ?? true,
                      department: targetUser.department || 'Engineering',
                      position: targetUser.position || 'Team Member',
                      phone: targetUser.phone || '+91 90000 10000',
                      type: targetUser.type || 'Full-time',
                      manager: targetUser.manager || 'Sara Khan',
                      location: targetUser.location || 'Mumbai',
                      scheduleId: targetUser.scheduleId || 'sch1',
                      bank: targetUser.bank || '',
                    });
                    setModal({ kind: 'userForm' });
                  }}
                >
                  Edit Account Details
                </button>
                <button
                  className="pill-btn !py-2 cursor-pointer"
                  onClick={() => setSelectedUserDrawer(null)}
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

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
                  : modal?.kind === 'userForm'
                  ? (userFormData.id ? 'Edit User Account' : 'New User Account')
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
                  ? 'PeoplePay360 - Crextio Design System'
                  : modal?.kind === 'clock'
                  ? 'Nisha Rao - Finance Manager - Live Shift'
                  : 'Connected records. One unified workspace.'}
              </DialogDescription>
            </div>
          </div>

          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-3">{error}</div>}

          {modal?.kind === 'userForm' && (
            <form onSubmit={handleSaveUser} className="space-y-4 pt-2">
              <Field label="Full Name">
                <Input
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="e.g. Maya Lin"
                  className="h-9 rounded-xl"
                />
              </Field>

              <Field label="Work Email">
                <Input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="e.g. maya@oxp.example"
                  className="h-9 rounded-xl"
                />
              </Field>

              <Field label="System Role">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {[
                    { id: 'admin', label: 'Admin', desc: 'Universal control' },
                    { id: 'payroll_manager', label: 'HR Payroll Manager', desc: 'Full payroll & rules governance' },
                    { id: 'payroll_user', label: 'HR Payroll User', desc: 'Compute payruns & contracts' },
                    { id: 'hr_manager', label: 'HR Manager', desc: 'Employees, attendance & time-off' },
                    { id: 'employee', label: 'Employee', desc: 'Self-service portal access' },
                  ].map((roleOption) => {
                    const isSelected = userFormData.roleId === roleOption.id;
                    return (
                      <label
                        key={roleOption.id}
                        onClick={() => setUserFormData({ ...userFormData, roleId: roleOption.id })}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-50/80 border-[#c99a2e] text-slate-900 shadow-2xs'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="userRoleId"
                          value={roleOption.id}
                          checked={isSelected}
                          onChange={() => setUserFormData({ ...userFormData, roleId: roleOption.id })}
                          className="mt-0.5 accent-[#c99a2e] cursor-pointer"
                        />
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-xs leading-tight">{roleOption.label}</span>
                          <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{roleOption.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Department">
                  <Input
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                    className="h-9 rounded-xl"
                  />
                </Field>

                <Field label="Position / Title">
                  <Input
                    value={userFormData.position}
                    onChange={(e) => setUserFormData({ ...userFormData, position: e.target.value })}
                    placeholder="e.g. Lead Designer"
                    className="h-9 rounded-xl"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Employment Type">
                  <select
                    className="h-9 w-full rounded-xl border border-slate-200 px-3 text-xs bg-white outline-none"
                    value={userFormData.type}
                    onChange={(e) => setUserFormData({ ...userFormData, type: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Intern">Intern</option>
                    <option value="Contract">Contract</option>
                  </select>
                </Field>

                <Field label="Location / Office">
                  <Input
                    value={userFormData.location}
                    onChange={(e) => setUserFormData({ ...userFormData, location: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="h-9 rounded-xl"
                  />
                </Field>
              </div>

              <Field label={userFormData.id ? 'Password (leave blank to keep current)' : 'Account Password'}>
                <Input
                  type="password"
                  required={!userFormData.id}
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder={userFormData.id ? '••••••••' : 'Enter password'}
                  className="h-9 rounded-xl"
                />
              </Field>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <Checkbox
                  checked={userFormData.active}
                  onCheckedChange={(v) => setUserFormData({ ...userFormData, active: !!v })}
                />
                Active account permitted to authenticate
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  className="pill-btn !py-1.5 cursor-pointer"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
                >
                  {busy ? 'Saving…' : 'Save Account'}
                </button>
              </div>
            </form>
          )}

            {modal?.kind === 'form' && s && (
            <RecordForm
              key={modal.collection + modal.record!.id}
              collection={modal.collection!}
              initial={modal.record!}
              s={s}
              busy={busy}
              onSave={saveRecord}
              onDelete={
                currentUser.role === 'Admin' ||
                currentUser.role === 'HR Payroll Manager' ||
                (['HR Manager', 'HR Payroll User'].includes(currentUser.role) &&
                  ['employees', 'contracts', 'attendance', 'requests', 'allocations', 'leaveTypes', 'schedules'].includes(modal.collection!))
                  ? deleteRecord
                  : undefined
              }
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
                    {modal.kind === 'request' && canReviewLeave(reviewedRecord) && (
                      <button
                        className="pill-btn !py-1.5 cursor-pointer"
                        disabled={busy}
                        onClick={() => void act('refuseLeave', { id: reviewedRecord.id }, 'Request refused.')}
                      >
                        Refuse
                      </button>
                    )}
                    {(modal.kind === 'request' ? canReviewLeave(reviewedRecord) : canReviewAllocation) && (
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
                    )}
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
                    {niceMonth(modal.record.period)} - {structure(modal.record.structureId)}
                  </p>
                </div>
                <Badge value={modal.record.status || 'Computed'} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Scheduled days', modal.record.scheduledDays ?? '-'],
                  ['Payable days', modal.record.payableDays ?? modal.record.scheduledDays ?? '-'],
                  ['Unpaid leave', modal.record.unpaidLeaveDays || 0],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                    <span className="mt-1 block text-sm font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>

              <DataTable
                rows={((modal.record.lines as Row[] | undefined) || []).map((l) => ({ ...l, id: l.code }))}
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
                <a
                  className="pill-btn pill-btn-black !py-1.5 cursor-pointer"
                  href={`/api/payslips/${encodeURIComponent(modal.record.id)}/pdf`}
                >
                  <Download size={13} /> Download PDF
                </a>
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
                Today -{' '}
                {mounted && clockNow
                  ? clockNow.toLocaleDateString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'long',
                    })
                  : '5 September'}{' '}
                - Asia/Kolkata
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {signedIn
                    ? 'Checked in at ' + currentClock?.checkIn
                    : currentClock?.checkOut
                    ? "Today's shift completed"
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
                  disabled={busy || !!currentClock?.checkOut || !currentUser.employeeId}
                  onClick={() =>
                    currentUser.employeeId &&
                    void act(
                      'clock',
                      { employeeId: currentUser.employeeId },
                      signedIn ? 'Checked out.' : 'Checked in.'
                    )
                  }
                >
                  {signedIn ? 'Check out' : 'Check in'}
                </button>
              </div>
            </div>
          )}

          {modal?.kind === 'about' && (
            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border border-amber-100/80 text-center">
                <Image
                  src="/favicon.png"
                  alt="PeoplePay360"
                  width={96}
                  height={96}
                  className="rounded-2xl object-contain shadow-xs border border-amber-200/60 bg-white mb-2"
                />
                <h3 className="font-extrabold text-slate-900 text-base flex items-center">
                  peoplepay<span className="text-[#e6a817]">360</span>
                </h3>
                <p className="text-[10px] font-bold tracking-widest text-amber-700/80 uppercase mt-0.5">
                  People * Payroll * Progress
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
  onCreate: (p: PayrunCreatePayload) => Promise<void>;
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
          01 - Scope & Period
        </span>
        <span className={step === 2 ? 'text-slate-900 border-b-2 border-slate-900 pb-1' : 'text-slate-400'}>
          02 - Select Employees
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
                placeholder="Search eligible employees..."
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
                    {!e.bank ? ' - Bank missing' : ''}
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
            {busy ? 'Creating...' : 'Create payrun'}
          </button>
        )}
      </div>
    </div>
  );
}
