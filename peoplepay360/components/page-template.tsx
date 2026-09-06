'use client';

import React, { ReactNode } from 'react';
import {
  LayoutGrid,
  Users,
  Briefcase,
  Clock3,
  CalendarDays,
  Wallet,
  Bell,
  HelpCircle,
  ArrowLeft,
  ChevronRight,
  Search,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { canView, type AppUser } from '@/lib/domain';
<<<<<<< HEAD
import Link from 'next/link';
import { LogOut, Shield, UserCog, KeyRound } from 'lucide-react';
=======
import { LogOut, Shield, Power, UserCog } from 'lucide-react';
>>>>>>> 3f342e940546d8bcc43507f326bc198f6fe96171

/* ─────────────────────────────────────────────────────────
   1. TYPES
   ───────────────────────────────────────────────────────── */
export type ViewTab = 'overview' | 'employees' | 'contracts' | 'attendance' | 'requests' | 'payruns' | 'users' | 'assignments';

export interface PageShellProps {
  currentView: string;
  onNavigate: (view: string, id?: string) => void;
  title: string;
  badgeText?: string;
  backAction?: () => void;
  actions?: ReactNode;
  leftPanel?: ReactNode;
  rightPanel?: ReactNode;
  children: ReactNode;
  signedIn?: boolean;
  onClockClick?: () => void;
  onAboutClick?: () => void;
  onNotificationClick?: () => void;
  error?: string;
  message?: string;
  onReload?: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
}

/* ─────────────────────────────────────────────────────────
   2. PAGE SHELL (Universal Top Nav + Subbar + 3-Col Canvas)
   ───────────────────────────────────────────────────────── */
export function PageShell({
  currentView,
  onNavigate,
  title,
  badgeText = 'Live Workspace',
  backAction,
  actions,
  leftPanel,
  rightPanel,
  children,
  signedIn = false,
  onClockClick,
  onAboutClick,
  onNotificationClick,
  error,
  message,
  onReload,
  currentUser,
  onLogout,
}: PageShellProps) {
  const isOverview = currentView === 'overview' || currentView === 'payroll/dashboard';
  const isEmployees = currentView === 'employees' || currentView === 'employee';
  const isContracts = currentView === 'contracts' || currentView === 'schedules';
  const isAttendance = currentView === 'attendance';
  const isTimeOff = ['requests', 'allocations', 'leaveTypes'].includes(currentView);
  const isPayroll = ['payruns', 'run', 'payslips', 'structures', 'rules'].includes(currentView);
  const isUsers = currentView === 'users' || currentView === 'admin/users';
  const isAssignments = currentView === 'assignments' || currentView === 'admin/assignments';

  const hasLeft = Boolean(leftPanel);
  const hasRight = Boolean(rightPanel);

  // Dynamic grid class based on slot presence
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '14px',
    alignItems: 'start',
    width: '100%',
    gridTemplateColumns:
      hasLeft && hasRight
        ? '260px minmax(0, 1fr) 310px'
        : hasLeft
        ? '260px minmax(0, 1fr)'
        : hasRight
        ? 'minmax(0, 1fr) 310px'
        : '1fr',
  };

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isCheckedIn = mounted && signedIn;

  return (
    <div className={`workora-shell ${isOverview ? 'overview-shell' : ''}`}>
      {/* ─── Universal Pill Navigation Bar ─── */}
      <header className="workora-topbar">
        <a
          href="#overview"
          className="workora-brand flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0 select-none"
          onClick={(e) => {
            e.preventDefault();
            onNavigate(currentUser?.role === 'Employee' ? 'attendance' : currentUser?.role === 'HR Manager' ? 'users' : 'overview');
          }}
        >
          <img
            src="/favicon.png"
            alt="PeoplePay360 Logo"
            className="w-8 h-8 rounded-lg object-contain border border-amber-200/60 shadow-2xs shrink-0"
          />
          <span className="font-extrabold tracking-tight text-slate-900 text-[18px] leading-none flex items-center">
            peoplepay<span className="text-[#e6a817]">360</span>
          </span>
        </a>

        {/* Center Navigation Pills */}
        <nav className="workora-nav-pills flex-wrap" aria-label="Main Navigation">
          {(!currentUser || canView(currentUser.role, 'payroll/dashboard')) && (
            <button
              className={`nav-pill ${isOverview ? 'active' : ''}`}
              onClick={() => onNavigate('overview')}
            >
              <LayoutGrid size={15} />
              Overview
            </button>
          )}
          {(!currentUser || canView(currentUser.role, 'employees')) && (
            <button
              className={`nav-pill ${isEmployees ? 'active' : ''}`}
              onClick={() => onNavigate('employees')}
            >
              <Users size={15} />
              Employees
            </button>
          )}
          {(!currentUser || canView(currentUser.role, 'contracts')) && (
            <button
              className={`nav-pill ${isContracts ? 'active' : ''}`}
              onClick={() => onNavigate('contracts')}
            >
              <Briefcase size={15} />
              Contracts
            </button>
          )}
          {(!currentUser || canView(currentUser.role, 'attendance')) && (
            <button
              className={`nav-pill ${isAttendance ? 'active' : ''}`}
              onClick={() => onNavigate('attendance')}
            >
              <Clock3 size={15} />
              Attendance
            </button>
          )}
          {(!currentUser || canView(currentUser.role, 'time-off')) && (
            <button
              className={`nav-pill ${isTimeOff ? 'active' : ''}`}
              onClick={() => onNavigate('requests')}
            >
              <CalendarDays size={15} />
              Time Off
            </button>
          )}
          {(!currentUser || canView(currentUser.role, 'payroll/payruns') || canView(currentUser.role, 'payroll/payslips')) && (
            <button
              className={`nav-pill ${isPayroll ? 'active' : ''}`}
              onClick={() => onNavigate(currentUser?.role === 'Employee' ? 'payslips' : 'payruns')}
            >
              <Wallet size={15} />
              {currentUser?.role === 'Employee' ? 'My Payslips' : 'Payroll'}
            </button>
          )}
          {currentUser && canView(currentUser.role, 'admin/users') && (
            <button
              className={`nav-pill ${isUsers ? 'active' : ''}`}
              onClick={() => onNavigate('users')}
            >
              <Shield size={15} />
              Users
            </button>
          )}
          {currentUser && canView(currentUser.role, 'admin/assignments') && (
            <button
              className={`nav-pill ${isAssignments ? 'active' : ''}`}
              onClick={() => onNavigate('assignments')}
            >
              <UserCog size={15} />
              Assignments
            </button>
          )}
        </nav>

        {/* Right Action Utility Buttons */}
        <div className="workora-top-actions items-center gap-2">
          {onClockClick && (
            <button
              className={`circle-btn relative transition-colors cursor-pointer ${
                isCheckedIn ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''
              }`}
              title={isCheckedIn ? 'Checked in · Live shift' : 'Attendance Check In / Out'}
              aria-label="Attendance"
              onClick={onClockClick}
            >
              <Power size={15} />
              <span
                className={`absolute top-1.5 right-1.5 size-2 rounded-full ring-2 ring-white transition-colors ${
                  isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
                }`}
              />
            </button>
          )}
          <button
            className="circle-btn"
            title="Notifications"
            aria-label="Notifications"
            onClick={onNotificationClick}
          >
            <Bell size={17} />
          </button>
          <button
            className="circle-btn"
            title="About PeoplePay360"
            aria-label="About prototype"
            onClick={onAboutClick}
          >
            <HelpCircle size={17} />
          </button>
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#e5ded4]">
              <div className="text-right hidden sm:block">
                <span className="font-bold text-xs text-slate-800 block leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-semibold text-[#8a7a6d] uppercase tracking-wide">
                  {currentUser.role}
                </span>
              </div>
              <div
                className="circle-avatar cursor-pointer"
                title={`${currentUser.name} · ${currentUser.role}`}
                onClick={onAboutClick}
              >
                {currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <Link
                href="/change-password"
                className="circle-btn hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                title="Change Password"
                aria-label="Change Password"
              >
                <KeyRound size={16} />
              </Link>
              {onLogout && (
                <button
                  className="circle-btn hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Sign Out"
                  aria-label="Sign out"
                  onClick={onLogout}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              className="circle-avatar"
              title="Demo Session"
              aria-label="User profile"
              onClick={onAboutClick}
            >
              NR
            </button>
          )}
        </div>
      </header>

      {/* ─── Sub-Header Action Toolbar ─── */}
      <div className="workora-subbar">
        <div className="subbar-left">
          {backAction && (
            <button className="subbar-back" onClick={backAction} title="Go back">
              <ArrowLeft size={16} />
            </button>
          )}
          <h1 className="subbar-title">{title}</h1>
          <span className="status-pill-badge">
            <span className="status-dot" />
            {badgeText}
          </span>
        </div>

        {actions && <div className="subbar-right">{actions}</div>}
      </div>

      {/* ─── Error / Alert Banners ─── */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 shadow-2xs flex items-center justify-between">
          <span>{error}</span>
          {onReload && (
            <button
              className="font-semibold underline ml-2 text-rose-900 cursor-pointer"
              onClick={onReload}
            >
              Reload
            </button>
          )}
        </div>
      )}

      {message && (
        <div className="p-3 bg-white border border-[#e5ded4] rounded-2xl text-xs text-slate-800 shadow-2xs font-medium">
          {message}
        </div>
      )}

      {/* ─── Universal 3-Column / Flexible Grid Canvas ─── */}
      <div className="template-grid" style={gridStyle}>
        {hasLeft && <aside className="dash-left">{leftPanel}</aside>}
        <main className="dash-center">{children}</main>
        {hasRight && <aside className="dash-right">{rightPanel}</aside>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   3. MASTER LIST (Reusable Left Column Container)
   ───────────────────────────────────────────────────────── */
export interface MasterListProps {
  title: string;
  count?: number;
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  children: ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
}

export function MasterList({
  title,
  count,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records…',
  filters,
  children,
  emptyText = 'No records match your filters',
  isEmpty = false,
}: MasterListProps) {
  return (
    <>
      <div className="dash-left-header">
        <div className="flex items-center justify-between">
          <p className="dash-left-title">
            {title} {typeof count === 'number' && `· ${count}`}
          </p>
        </div>

        {filters && <div className="flex flex-col gap-2">{filters}</div>}

        <div className="pill-search">
          <Search className="size-3.5 shrink-0" style={{ color: '#9c8f85' }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="dash-left-list">
        {isEmpty ? (
          <div className="py-10 flex flex-col items-center gap-2 text-center">
            <Inbox className="size-7" style={{ color: '#c4b8aa' }} />
            <p className="text-xs" style={{ color: '#9c8f85' }}>
              {emptyText}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   4. MASTER CARD (Reusable Left Column Record Card)
   ───────────────────────────────────────────────────────── */
export interface MasterCardProps {
  avatar?: string | ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  meta?: string | ReactNode;
  active?: boolean;
  onClick: () => void;
  progress?: {
    label: string;
    value: number; // 0 - 100
    displayValue?: string;
    variant?: 'gold' | 'dark' | 'green';
  };
}

export function MasterCard({
  avatar,
  title,
  subtitle,
  badge,
  meta,
  active = false,
  onClick,
  progress,
}: MasterCardProps) {
  return (
    <button
      className={`emp-card ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="emp-card-top">
        {typeof avatar === 'string' ? (
          <div className="emp-avatar-lg">{avatar}</div>
        ) : avatar ? (
          avatar
        ) : (
          <div className="emp-avatar-lg">{title.slice(0, 2).toUpperCase()}</div>
        )}
        <div className="emp-card-info">
          <p className="emp-card-name">{title}</p>
          {subtitle && <p className="emp-card-sub">{subtitle}</p>}
        </div>
        {badge && <StatusBadge value={badge} size="sm" showDot={false} />}
        {meta && <span className="text-[11px] text-slate-400 font-medium ml-auto">{meta}</span>}
      </div>

      {progress && (
        <div className="emp-card-bar-row">
          <div className="emp-card-bar-label">
            <span>{progress.label}</span>
            <span>{progress.displayValue ?? `${Math.round(progress.value)}%`}</span>
          </div>
          <div className="emp-bar-track">
            <div
              className={`emp-bar-fill ${
                progress.variant === 'dark'
                  ? '!bg-[#1a1a1a]'
                  : progress.variant === 'green'
                  ? '!bg-emerald-500'
                  : ''
              }`}
              style={{ width: `${Math.min(Math.max(progress.value, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   5. DETAIL PANEL (Reusable Right Column Contextual Card)
   ───────────────────────────────────────────────────────── */
export interface DetailPanelProps {
  avatar?: string | ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
}

export function DetailPanel({
  avatar,
  title,
  subtitle,
  badge,
  children,
}: DetailPanelProps) {
  return (
    <>
      <div className="dash-right-header">
        {typeof avatar === 'string' ? (
          <div className="dash-right-avatar">{avatar}</div>
        ) : avatar ? (
          avatar
        ) : (
          <div className="dash-right-avatar">{title.slice(0, 2).toUpperCase()}</div>
        )}
        <div>
          <h3 className="dash-right-name">{title}</h3>
          {subtitle && <p className="dash-right-role">{subtitle}</p>}
        </div>
        {badge && <StatusBadge value={badge} size="default" />}
      </div>
      {children}
    </>
  );
}

export function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="dash-right-section">
      <p className="dash-section-title">{title}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="dash-info-row">
      <span className="dash-info-label">{label}</span>
      <span className="dash-info-value">{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   6. STAT BAR (Gold Accent Progress Indicator)
   ───────────────────────────────────────────────────────── */
export function StatBar({
  label,
  value,
  max = 100,
  displayValue,
  variant = 'gold',
}: {
  label: string;
  value: number;
  max?: number;
  displayValue?: string;
  variant?: 'gold' | 'dark' | 'green';
}) {
  const pct = max > 0 ? Math.round(Math.min((value / max) * 100, 100)) : 0;
  const fillClass =
    variant === 'dark'
      ? 'stat-fill fill-dark'
      : variant === 'green'
      ? 'stat-fill fill-green'
      : 'stat-fill';

  return (
    <div className="stat-row">
      <div className="stat-row-header">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{displayValue ?? `${pct}%`}</span>
      </div>
      <div className="stat-track">
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   7. DOC CHIP (Clickable Document / Contract / File Chip)
   ───────────────────────────────────────────────────────── */
export function DocChip({
  icon = '📄',
  name,
  meta,
  onClick,
}: {
  icon?: ReactNode;
  name: string;
  meta?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="doc-chip hover:bg-[#ede7de] transition-colors cursor-pointer text-left"
      onClick={onClick}
    >
      <span className="doc-chip-icon">{icon}</span>
      <span className="doc-chip-name">{name}</span>
      {meta && <span className="doc-chip-meta">{meta}</span>}
      <ChevronRight className="size-3 ml-auto text-slate-400" />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   8. KPI CARDS (Warm Accent Metric Cards)
   ───────────────────────────────────────────────────────── */
export function KpiCard({
  label,
  value,
  sub,
  icon,
  variant = 'light',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  variant?: 'light' | 'dark' | 'gold';
}) {
  const variantClass =
    variant === 'dark' ? 'accent-black' : variant === 'gold' ? 'accent-gold' : '';

  return (
    <div className={`kpi-card ${variantClass}`}>
      <span className="kpi-card-label">{label}</span>
      <span className="kpi-card-value">{value}</span>
      {sub && <p className="kpi-card-sub">{sub}</p>}
      {icon && <div className="kpi-card-icon">{icon}</div>}
    </div>
  );
}
