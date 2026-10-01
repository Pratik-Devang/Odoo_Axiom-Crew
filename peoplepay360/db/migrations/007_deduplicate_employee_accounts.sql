-- Payroll Operations is a system account, not a second login for Nisha Rao.
UPDATE users
SET employee_id = NULL
WHERE id = 'u_payroll_user';

-- Prefer the named demo account for its linked employee, otherwise prefer the
-- account whose email matches the employee directory record.
CREATE TEMP TABLE canonical_employee_users ON COMMIT DROP AS
SELECT DISTINCT ON (u.employee_id)
  u.employee_id,
  u.id AS user_id,
  u.role_id
FROM users u
JOIN employees e ON e.id = u.employee_id
WHERE u.employee_id IS NOT NULL
ORDER BY
  u.employee_id,
  (u.id IN ('u_admin', 'u_payroll_manager', 'u_hr_manager', 'u_employee')) DESC,
  (lower(u.email) = lower(e.email)) DESC,
  u.id;

-- Move teams only when the canonical identity remains an HR Manager. Broader
-- admin/payroll accounts do not appear in the manager-assignment screen.
UPDATE manager_employee_assignments assignment
SET manager_user_id = canonical.user_id
FROM users duplicate_user
JOIN canonical_employee_users canonical
  ON canonical.employee_id = duplicate_user.employee_id
WHERE assignment.manager_user_id = duplicate_user.id
  AND duplicate_user.id <> canonical.user_id
  AND canonical.role_id = 'hr_manager'
  AND NOT EXISTS (
    SELECT 1
    FROM manager_employee_assignments existing
    WHERE existing.manager_user_id = canonical.user_id
      AND existing.employee_id = assignment.employee_id
  );

DELETE FROM users duplicate_user
USING canonical_employee_users canonical
WHERE duplicate_user.employee_id = canonical.employee_id
  AND duplicate_user.id <> canonical.user_id;

DELETE FROM manager_employee_assignments assignment
USING users manager_user
WHERE manager_user.id = assignment.manager_user_id
  AND manager_user.role_id <> 'hr_manager';

INSERT INTO manager_employee_assignments (manager_user_id, employee_id)
SELECT manager_user.id, employee.id
FROM employees employee
JOIN users manager_user ON manager_user.employee_id = employee.manager_employee_id
WHERE manager_user.role_id = 'hr_manager'
ON CONFLICT (employee_id) DO NOTHING;
