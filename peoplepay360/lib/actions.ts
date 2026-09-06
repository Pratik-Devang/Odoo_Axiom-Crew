
import {
  type Workspace,
  type Row,
  uid,
  round,
  activeContract,
  computeSlip,
  warnings,
  allocationBalance,
  formula,
  monthEnd,
  workingDaysBetween,
  scheduleRows,
  scheduleWeeklyHours,
  employeeSchedule,
  scheduleRowForDate,
} from './domain';
const requireThat = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};
const text = (v: unknown) =>
  typeof v === 'string' && v.trim().length > 0 && v.length < 500;
const date = (v: unknown) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const numeric = (v: unknown) => Number.isFinite(Number(v)) && Number(v) >= 0;
const exists = (list: Row[], id: string) => list.some((x) => x.id === id);
const period = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
export function mutate(
  source: Workspace,
  action: string,
  p: Record<string, any>,
  actor = 'System',
): Workspace {
  const s = structuredClone(source);
  if (action === 'save') {
    const collection = p.collection as keyof Workspace;
    requireThat(
      [
        'employees',
        'contracts',
        'attendance',
        'requests',
        'allocations',
        'leaveTypes',
        'rules',
        'structures',
        'schedules',
      ].includes(collection),
      'Unknown record type.',
    );
    const old = s[collection].find((x) => x.id === p.record.id),
      r: Row = { ...p.record, id: old?.id || uid() };
    if (
      ['employees', 'leaveTypes', 'rules', 'structures', 'schedules'].includes(
        collection,
      )
    )
      requireThat(text(r.name), 'Name is required.');
    if (
      ['contracts', 'attendance', 'requests', 'allocations'].includes(
        collection,
      )
    )
      requireThat(
        exists(s.employees, r.employeeId),
        'Select a valid employee.',
      );
    if (collection === 'employees') {
      requireThat(
        text(r.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email),
        'Enter a valid work email.',
      );
      requireThat(
        !s.employees.some(
          (e) =>
            e.id !== r.id && e.email.toLowerCase() === r.email.toLowerCase(),
        ),
        'This email is already in use.',
      );
      requireThat(
        text(r.department) && text(r.position),
        'Department and job position are required.',
      );
      requireThat(
        ['Active', 'Archived'].includes(r.status),
        'Invalid employee status.',
      );
      requireThat(
        ['Full-time', 'Contract', 'Intern'].includes(r.type),
        'Invalid employee type.',
      );
      requireThat(
        exists(s.schedules, r.scheduleId),
        'Select a working schedule.',
      );
      requireThat(
        !r.managerEmployeeId ||
          (r.managerEmployeeId !== r.id &&
            exists(s.employees, r.managerEmployeeId)),
        'Select a valid manager other than the employee.',
      );
      r.manager = r.managerEmployeeId
        ? s.employees.find((e) => e.id === r.managerEmployeeId)?.name || ''
        : '';
    }
    if (collection === 'contracts') {
      requireThat(
        date(r.start) && (!r.end || (date(r.end) && r.end >= r.start)),
        'Enter a valid contract date range.',
      );
      requireThat(
        numeric(r.wage) && +r.wage > 0,
        'Wage must be greater than zero.',
      );
      r.wage = +r.wage;
      requireThat(
        exists(s.structures, r.structureId) &&
          exists(s.schedules, r.scheduleId),
        'Select a salary structure and schedule.',
      );
      requireThat(
        !s.contracts.some(
          (c) =>
            c.id !== r.id &&
            c.employeeId === r.employeeId &&
            c.start <= (r.end || '9999-12-31') &&
            r.start <= (c.end || '9999-12-31'),
        ),
        'Contract dates overlap an existing contract.',
      );
      if (old) {
        const finalized = s.payruns.filter(
          (run) =>
            ['Validated', 'Paid'].includes(run.status) &&
            run.slips.some((sl: Row) => sl.contractId === old.id),
        );
        requireThat(
          !finalized.length ||
            (r.employeeId === old.employeeId &&
              r.start === old.start &&
              r.wage === old.wage &&
              r.structureId === old.structureId &&
              r.scheduleId === old.scheduleId &&
              finalized.every(
                (run) => !r.end || r.end >= monthEnd(run.period),
              )),
          'Preserve the terms and date coverage used by finalized payroll. You may end this contract after its finalized periods, then create a successor.',
        );
      }
    }
    if (collection === 'attendance') {
      const time = (t: any) =>
        !t || (typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
      requireThat(
        date(r.date) && time(r.checkIn) && time(r.checkOut),
        'Enter valid attendance date and times.',
      );
      requireThat(
        !r.checkOut || (r.checkIn && r.checkOut > r.checkIn),
        'Check-out must be after check-in; overnight shifts are outside prototype scope.',
      );
      requireThat(
        !s.attendance.some(
          (a) =>
            a.id !== r.id && a.employeeId === r.employeeId && a.date === r.date,
        ),
        'Attendance already exists for this employee and date.',
      );
      if (r.overtime !== undefined && r.overtime !== '')
        requireThat(
          numeric(r.overtime) && +r.overtime <= 24,
          'Overtime must be a number between 0 and 24 hours.',
        );
      r.overtime =
        r.overtime !== undefined && r.overtime !== ''
          ? round(+r.overtime)
          : undefined;
      r.edited = !!old;
    }
    if (collection === 'requests' || collection === 'allocations') {
      requireThat(exists(s.leaveTypes, r.typeId), 'Select a time off type.');
      requireThat(
        date(r.start) && date(r.end) && r.end >= r.start,
        'Enter a valid date range.',
      );
      requireThat(
        !old || old.status === 'Pending',
        'Approved or refused records cannot be edited.',
      );
      r.status = 'Pending';
      if (collection === 'allocations') {
        requireThat(
          numeric(r.amount) && +r.amount > 0,
          'Allocation must be greater than zero.',
        );
        r.amount = +r.amount;
        requireThat(
          !s.allocations.some(
            (a) =>
              a.id !== r.id &&
              a.employeeId === r.employeeId &&
              a.typeId === r.typeId &&
              a.start <= r.end &&
              r.start <= a.end,
          ),
          'An allocation for this type and validity period already exists.',
        );
      } else {
        const t = s.leaveTypes.find((t) => t.id === r.typeId)!;
        requireThat(
          t.unit !== 'Hours' || r.start === r.end,
          'Hourly leave must be on a single date.',
        );
        if (t.unit === 'Days')
          r.duration = workingDaysBetween(s, r.employeeId, r.start, r.end);
        else {
          requireThat(
            !!scheduleRowForDate(
              employeeSchedule(s, r.employeeId, r.start),
              r.start,
            ),
            'Hourly leave must fall on a scheduled working day.',
          );
          r.duration = +r.duration;
        }
        requireThat(
          numeric(r.duration) && r.duration > 0,
          'The request must include scheduled working time.',
        );
        requireThat(text(r.reason), 'A reason is required.');
        requireThat(
          !s.requests.some(
            (a) =>
              a.id !== r.id &&
              a.employeeId === r.employeeId &&
              a.status !== 'Refused' &&
              a.start <= r.end &&
              r.start <= a.end,
          ),
          'This employee already has leave requested on these dates.',
        );
        if (t.approvalWorkflow === 'No Approval') {
          if (t.requiresAllocation) {
            const a = s.allocations.find(
              (a) =>
                a.employeeId === r.employeeId &&
                a.typeId === r.typeId &&
                a.status === 'Approved' &&
                a.start <= r.start &&
                a.end >= r.end,
            );
            requireThat(
              a && allocationBalance(s, a) >= r.duration,
              'Insufficient approved leave allocation for these dates.',
            );
            r.allocationId = a!.id;
          }
          r.status = 'Approved';
          r.approver = 'Automatic policy';
        }
      }
    }
    if (collection === 'leaveTypes') {
      requireThat(['Days', 'Hours'].includes(r.unit), 'Invalid leave unit.');
      requireThat(
        ['No Approval', 'Manager Approval', 'HR Approval'].includes(
          r.approvalWorkflow,
        ),
        'Select an approval workflow.',
      );
      requireThat(
        ['Paid', 'Unpaid', 'No Payroll Impact'].includes(r.payrollImpact),
        'Select a payroll treatment.',
      );
      r.requiresAllocation = !!r.requiresAllocation;
      r.payrollWorkEntry = r.payrollWorkEntry || '';
      r.displayColor = r.displayColor || 'Blue';
      r.active = r.active !== false;
      requireThat(
        !old ||
          (!s.requests.some((q) => q.typeId === old.id) &&
            !s.allocations.some((a) => a.typeId === old.id)) ||
          (old.unit === r.unit &&
            old.requiresAllocation === r.requiresAllocation),
        'Cannot change units or allocation policy after this type has been used.',
      );
    }
    if (collection === 'rules') {
      requireThat(
        /^[A-Z][A-Z_0-9]*$/.test(r.code) && r.code !== 'WAGE',
        'Use an uppercase unique rule code other than WAGE.',
      );
      requireThat(
        !s.rules.some((x) => x.id !== r.id && x.code === r.code),
        'Rule code already exists.',
      );
      requireThat(
        numeric(r.sequence) && numeric(r.value),
        'Sequence and amount must be non-negative.',
      );
      r.sequence = +r.sequence;
      r.value = +r.value;
      requireThat(
        ['Fixed', 'Percentage', 'Formula'].includes(r.method) &&
          ['Basic', 'Allowance', 'Deduction'].includes(r.category),
        'Invalid rule configuration.',
      );
      if (r.method === 'Formula') {
        requireThat(text(r.expression), 'Enter a formula.');
        const codes = Object.fromEntries(
          s.rules
            .filter((x) => x.sequence < r.sequence && x.id !== r.id)
            .map((x) => [x.code, 100]),
        );
        formula(r.expression, { WAGE: 100, ...codes });
      }
      if (r.method === 'Percentage')
        requireThat(
          r.base === 'WAGE' ||
            s.rules.some((x) => x.code === r.base && x.sequence < r.sequence),
          'Percentage base must be wage or an earlier salary rule.',
        );
    }
    if (collection === 'structures') {
      requireThat(
        Array.isArray(r.ruleIds) &&
          r.ruleIds.length &&
          r.ruleIds.every((id: string) => exists(s.rules, id)),
        'Select at least one valid salary rule.',
      );
      r.ruleIds = [...new Set(r.ruleIds)];
      r.active = !!r.active;
    }
    if (collection === 'schedules') {
      const ts = (t: any) =>
        typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
      requireThat(
        ['Fixed', 'Flexible', 'Shift'].includes(r.type),
        'Select a schedule type.',
      );
      requireThat(Array.isArray(r.workRows), 'Add weekly schedule rows.');
      const rows = scheduleRows(r);
      requireThat(
        rows.some((row) => row.working),
        'Select at least one working day.',
      );
      rows
        .filter((row) => row.working)
        .forEach((row) => {
          requireThat(
            ts(row.start) && ts(row.end),
            `Enter valid hours for ${row.day}.`,
          );
          requireThat(numeric(row.breakHours), 'Enter valid break hours.');
          row.breakHours = +row.breakHours;
          const startMinutes =
            +row.start.slice(0, 2) * 60 + +row.start.slice(3);
          const endMinutes = +row.end.slice(0, 2) * 60 + +row.end.slice(3);
          requireThat(
            endMinutes !== startMinutes,
            `${row.day} start and end times must differ.`,
          );
          const span = ((endMinutes - startMinutes + 24 * 60) % (24 * 60)) / 60;
          requireThat(
            row.breakHours < span,
            `Break must be shorter than the ${row.day} shift.`,
          );
        });
      r.workRows = rows;
      r.days = rows.filter((row) => row.working).map((row) => row.day);
      const first = rows.find((row) => row.working)!;
      r.start = first.start;
      r.end = first.end;
      r.breakHours = first.breakHours;
      r.weeklyHours = scheduleWeeklyHours(r);
      r.company =
        typeof r.company === 'string' && r.company.trim()
          ? r.company.trim()
          : 'My Company';
      r.timezone =
        typeof r.timezone === 'string' && r.timezone.trim()
          ? r.timezone.trim()
          : 'Company timezone';
      r.status = ['Active', 'Inactive'].includes(r.status)
        ? r.status
        : 'Active';
    }
    if (old) s[collection] = s[collection].map((x) => (x.id === r.id ? r : x));
    else s[collection].push(r);
    if (
      [
        'rules',
        'structures',
        'contracts',
        'attendance',
        'requests',
        'leaveTypes',
        'schedules',
      ].includes(collection)
    )
      s.payruns.forEach((run) => {
        if (run.status === 'Computed') {
          run.status = 'Draft';
          run.slips = [];
        }
      });
  } else if (action === 'delete') {
    const collection = p.collection as keyof Workspace,
      id = String(p.id || '');
    requireThat(
      [
        'employees',
        'contracts',
        'attendance',
        'requests',
        'allocations',
        'leaveTypes',
        'rules',
        'structures',
        'schedules',
        'payruns',
      ].includes(collection),
      'Unknown record type.',
    );
    const list = s[collection],
      record = list.find((x) => x.id === id);
    requireThat(record, 'Record not found.');
    if (collection === 'employees') {
      record!.status = 'Archived';
    } else {
      if (collection === 'contracts')
        requireThat(
          !s.payruns.some(
            (run) =>
              ['Validated', 'Paid'].includes(run.status) &&
              run.slips.some((sl: Row) => sl.contractId === id),
          ),
          'A contract used by finalized payroll cannot be deleted.',
        );
      if (collection === 'requests' || collection === 'allocations')
        requireThat(
          record!.status === 'Pending',
          'Only pending leave records can be deleted.',
        );
      if (collection === 'leaveTypes')
        requireThat(
          !s.requests.some((x) => x.typeId === id) &&
            !s.allocations.some((x) => x.typeId === id),
          'This time off type is already in use.',
        );
      if (collection === 'rules')
        requireThat(
          !s.structures.some((x) => x.ruleIds.includes(id)),
          'Remove this rule from salary structures first.',
        );
      if (collection === 'structures')
        requireThat(
          !s.contracts.some((x) => x.structureId === id) &&
            !s.payruns.some((x) => x.structureId === id),
          'This structure is already in use.',
        );
      if (collection === 'schedules')
        requireThat(
          !s.employees.some((x) => x.scheduleId === id) &&
            !s.contracts.some((x) => x.scheduleId === id),
          'This schedule is already assigned.',
        );
      if (collection === 'payruns')
        requireThat(
          ['Draft', 'Computed'].includes(record!.status),
          'Validated or paid payruns cannot be deleted.',
        );
      s[collection] = list.filter((x) => x.id !== id) as any;
      if (
        [
          'contracts',
          'attendance',
          'rules',
          'structures',
          'requests',
          'leaveTypes',
          'schedules',
        ].includes(collection)
      )
        s.payruns.forEach((run) => {
          if (run.status === 'Computed') {
            run.status = 'Draft';
            run.slips = [];
          }
        });
    }
  } else if (
    action === 'approveLeave' ||
    action === 'refuseLeave' ||
    action === 'approveAllocation'
  ) {
    const list = action === 'approveAllocation' ? s.allocations : s.requests,
      r = list.find((x) => x.id === p.id);
    requireThat(
      r && r.status === 'Pending',
      'Only pending records can be reviewed.',
    );
    if (action === 'approveLeave') {
      const t = s.leaveTypes.find((x) => x.id === r!.typeId)!;
      if (t.requiresAllocation) {
        const a = s.allocations.find(
          (a) =>
            a.employeeId === r!.employeeId &&
            a.typeId === r!.typeId &&
            a.status === 'Approved' &&
            a.start <= r!.start &&
            a.end >= r!.end,
        );
        requireThat(
          a && allocationBalance(s, a) >= r!.duration,
          'Insufficient approved leave allocation for these dates.',
        );
        r!.allocationId = a!.id;
      }
    }
    r!.status = action === 'refuseLeave' ? 'Refused' : 'Approved';
    r!.approver = actor;
    s.payruns.forEach((run) => {
      if (run.status === 'Computed') {
        run.status = 'Draft';
        run.slips = [];
      }
    });
  } else if (action === 'createPayrun') {
    requireThat(period(p.period), 'Select a valid payroll month.');
    requireThat(
      exists(s.structures, p.structureId),
      'Select a salary structure.',
    );
    requireThat(
      Array.isArray(p.employeeIds) && p.employeeIds.length,
      'Select at least one employee.',
    );
    const ids = [...new Set<string>(p.employeeIds)];
    ids.forEach((id) => {
      requireThat(
        s.employees.some((e) => e.id === id && e.status === 'Active'),
        'Select active employees only.',
      );
      const c = activeContract(s, id, p.period);
      requireThat(
        c.structureId === p.structureId,
        'Employee contract does not match the selected structure.',
      );
      requireThat(
        !s.payruns.some(
          (r) => r.period === p.period && r.employeeIds.includes(id),
        ),
        'An employee is already in a payrun for this period.',
      );
    });
    s.payruns.push({
      id: uid(),
      name: new Date(p.period + '-01').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      period: p.period,
      structureId: p.structureId,
      employeeIds: ids,
      status: 'Draft',
      slips: [],
    });
  } else if (['compute', 'validate', 'markPaid'].includes(action)) {
    const r = s.payruns.find((x) => x.id === p.id);
    requireThat(r, 'Payrun not found.');
    if (action === 'compute') {
      requireThat(
        ['Draft', 'Computed'].includes(r!.status),
        'Finalized payroll cannot be recomputed.',
      );
      r!.slips = r!.employeeIds.map((id: string) =>
        computeSlip(s, id, r!.period, r!.structureId),
      );
      r!.status = 'Computed';
    }
    if (action === 'validate') {
      requireThat(
        r!.status === 'Computed' && r!.slips.length === r!.employeeIds.length,
        'Compute all payslips before validation.',
      );
      const blocking = warnings(s, r!);
      requireThat(!blocking.length, blocking.join('; '));
      r!.status = 'Validated';
    }
    if (action === 'markPaid') {
      requireThat(
        r!.status === 'Validated',
        'Validate payroll before marking it paid.',
      );
      r!.status = 'Paid';
      r!.paidAt = new Date().toISOString();
    }
  } else if (action === 'clock') {
    const now = new Date(),
      dateValue = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      timeValue = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
      });
    requireThat(exists(s.employees, p.employeeId), 'Employee not found.');
    const a = s.attendance.find(
      (a) => a.employeeId === p.employeeId && a.date === dateValue,
    );
    if (a?.checkOut)
      throw new Error(
        'Attendance for today is complete. Use Attendance module to review records.',
      );
    const sched = employeeSchedule(s, p.employeeId, dateValue);
    const exp = scheduleRowForDate(sched, dateValue)?.start || '09:00';
    if (a?.checkIn) {
      a.checkOut = timeValue;
      const inM = +a.checkIn.slice(0, 2) * 60 + +a.checkIn.slice(3);
      const outM = +timeValue.slice(0, 2) * 60 + +timeValue.slice(3);
      const diff = Math.max(0, outM - inM);
      a.workedHours = round(diff / 60);
      a.status = 'Completed';
    } else if (a) {
      a.checkIn = timeValue;
      a.workedHours = 0;
      a.status = timeValue > exp ? 'Late' : 'Present';
    } else {
      s.attendance.push({
        id: uid(),
        employeeId: p.employeeId,
        date: dateValue,
        checkIn: timeValue,
        checkOut: '',
        workedHours: 0,
        status: timeValue > exp ? 'Late' : 'Present',
        edited: false,
      });
    }
  } else throw new Error('Unknown action.');
  s.audit.unshift({ id: uid(), action, at: new Date().toISOString(), actor });
  s.audit = s.audit.slice(0, 100);
  return s;
}
