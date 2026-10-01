import assert from 'node:assert/strict';
import test from 'node:test';

import { seed } from '../lib/domain';
import { canMutateWorkspace, visibleWorkspace } from '../lib/workspace-access';
import type { JwtPayload } from '../lib/jwt';

function manager(assignedEmployeeIds: string[]): JwtPayload {
  return {
    id: 'manager-user',
    name: 'Manager',
    email: 'manager@example.test',
    role: 'HR Manager',
    assignedEmployeeIds,
  };
}

void test('HR managers only receive records belonging to assigned employees', () => {
  const workspace = seed();
  const employeeIds = workspace.employees.slice(0, 2).map((item) => item.id);
  const visible = visibleWorkspace(workspace, manager(employeeIds));

  assert.deepEqual(visible.employees.map((item) => item.id), employeeIds);
  for (const collection of ['contracts', 'attendance', 'requests', 'allocations'] as const) {
    assert.ok(visible[collection].every((item) => employeeIds.includes(item.employeeId)));
  }
  assert.deepEqual(visible.payruns, []);
  assert.deepEqual(visible.audit, []);
});

void test('HR managers cannot read any employee records when no team is assigned', () => {
  const visible = visibleWorkspace(seed(), manager([]));
  assert.deepEqual(visible.employees, []);
  assert.deepEqual(visible.contracts, []);
  assert.deepEqual(visible.attendance, []);
  assert.deepEqual(visible.requests, []);
  assert.deepEqual(visible.allocations, []);
});

void test('HR manager mutations are limited to assigned employees', () => {
  const workspace = seed();
  const assigned = workspace.employees[0];
  const unassigned = workspace.employees[1];
  const user = manager([assigned.id]);

  assert.equal(canMutateWorkspace(user, workspace, 'save', {
    collection: 'employees',
    record: assigned,
  }), true);
  assert.equal(canMutateWorkspace(user, workspace, 'save', {
    collection: 'employees',
    record: unassigned,
  }), false);
  assert.equal(canMutateWorkspace(user, workspace, 'save', {
    collection: 'employees',
    record: { ...assigned, id: '' },
  }), false);
  assert.equal(canMutateWorkspace(user, workspace, 'save', {
    collection: 'leaveTypes',
    record: workspace.leaveTypes[0],
  }), false);
});
