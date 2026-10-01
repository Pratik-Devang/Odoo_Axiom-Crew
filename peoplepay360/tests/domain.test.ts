import assert from 'node:assert/strict';
import test from 'node:test';

import { mutate } from '../lib/actions';
import { computeSlip, seed } from '../lib/domain';

test('night-shift schedules can be saved without changing their hours', () => {
  const workspace = seed();
  const nightShift = workspace.schedules.find(
    (schedule) => schedule.id === 'sch2',
  );
  assert.ok(nightShift);

  const updated = mutate(
    workspace,
    'save',
    { collection: 'schedules', record: nightShift },
    'Test',
  );

  assert.equal(
    updated.schedules.find((schedule) => schedule.id === 'sch2')?.weeklyHours,
    35,
  );
});

test('payroll validation blocks employees without bank details', () => {
  const workspace = seed();

  assert.throws(
    () => mutate(workspace, 'validate', { id: 'run9' }, 'Test'),
    /missing bank details/,
  );
});

test('payruns cannot use a structure that differs from the active contract', () => {
  const workspace = seed();
  const contract = workspace.contracts.find((item) => item.employeeId === 'e0');
  assert.ok(contract);
  contract.start = '2026-10-15';

  assert.throws(
    () =>
      mutate(
        workspace,
        'createPayrun',
        { period: '2026-10', structureId: 'intern', employeeIds: ['e0'] },
        'Test',
      ),
    /does not match the selected structure/,
  );
});

test('partial-month payroll ignores overtime and unpaid leave outside the contract', () => {
  const workspace = seed();
  const contract = workspace.contracts.find((item) => item.employeeId === 'e0');
  assert.ok(contract);
  contract.start = '2026-09-15';
  workspace.attendance = [
    {
      id: 'before',
      employeeId: 'e0',
      date: '2026-09-10',
      checkIn: '09:00',
      checkOut: '18:00',
      overtime: 5,
    },
    {
      id: 'inside',
      employeeId: 'e0',
      date: '2026-09-16',
      checkIn: '09:00',
      checkOut: '18:00',
      overtime: 2,
    },
  ];
  workspace.requests.push(
    {
      id: 'leave-before',
      employeeId: 'e0',
      typeId: 'unpaid',
      start: '2026-09-10',
      end: '2026-09-10',
      duration: 1,
      reason: 'Before contract',
      status: 'Approved',
    },
    {
      id: 'leave-inside',
      employeeId: 'e0',
      typeId: 'unpaid',
      start: '2026-09-16',
      end: '2026-09-16',
      duration: 1,
      reason: 'During contract',
      status: 'Approved',
    },
  );

  const slip = computeSlip(workspace, 'e0', '2026-09', 'regular');

  assert.equal(slip.overtimeHours, 2);
  assert.equal(slip.unpaidLeaveDays, 1);
  assert.equal(slip.isProrated, true);
});
