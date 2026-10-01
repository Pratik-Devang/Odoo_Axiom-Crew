'use client';

import { MasterList, MasterCard } from '@/components/page-template';
import { Picker } from '@/components/peoplepay-ui';
import type { EmployeeRosterRow } from '@/lib/dashboard-types';

export interface EmployeeRosterListProps {
  rows: EmployeeRosterRow[];
  departments: string[];
  department: string;
  employeeType: string;
  search: string;
  activeEmployeeId: string;
  onSearchChange: (query: string) => void;
  onDepartmentChange: (department: string) => void;
  onEmployeeTypeChange: (type: string) => void;
  onSelectEmployee: (employeeId: string) => void;
  initials: (name: string) => string;
}

export function EmployeeRosterList({
  rows,
  departments,
  department,
  employeeType,
  search,
  activeEmployeeId,
  onSearchChange,
  onDepartmentChange,
  onEmployeeTypeChange,
  onSelectEmployee,
  initials,
}: EmployeeRosterListProps) {
  return (
    <MasterList
      title="Team Directory"
      count={rows.length}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search employee..."
      filters={
        <div className="grid grid-cols-2 gap-2 w-full">
          <Picker label="Dept" value={department} onChange={onDepartmentChange} options={['All', ...departments]} />
          <Picker
            label="Type"
            value={employeeType}
            onChange={onEmployeeTypeChange}
            options={['All', 'Full-time', 'Part-time', 'Intern', 'Contract']}
          />
        </div>
      }
      isEmpty={rows.length === 0}
    >
      {rows.map((e) => {
        const attRate = e.attendanceRate;
        const displayValue = attRate === null ? '—' : `${attRate}%`;
        const progressValue = attRate ?? 0;
        return (
          <MasterCard
            key={e.id}
            avatar={initials(e.name)}
            title={e.name}
            subtitle={`${e.department} · ${e.type}`}
            badge={e.status}
            active={e.id === activeEmployeeId}
            onClick={() => onSelectEmployee(e.id)}
            progress={{
              label: 'Attendance',
              value: progressValue,
              displayValue,
              variant: attRate !== null && attRate >= 80 ? 'gold' : 'dark',
            }}
          />
        );
      })}
    </MasterList>
  );
}
