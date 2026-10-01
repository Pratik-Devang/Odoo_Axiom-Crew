-- Use the employee-backed Sara account as the single source of identity, while
-- retaining the well-known demo login and its password.
WITH sara AS (
  SELECT e.id AS employee_id
  FROM employees e
  WHERE lower(e.name) = 'sara khan'
  ORDER BY (lower(e.email) = 'sara.khan@oxp.example') DESC, e.id
  LIMIT 1
), canonical AS (
  SELECT u.id
  FROM users u
  JOIN sara s ON s.employee_id = u.employee_id
  ORDER BY (u.id = 'u_hr_manager') DESC, (lower(u.email) = 'sara@oxp.example') DESC, u.id
  LIMIT 1
)
UPDATE users u
SET name = 'Sara Khan', role_id = 'hr_manager'
FROM canonical c
WHERE u.id = c.id;

WITH sara AS (
  SELECT e.id AS employee_id FROM employees e WHERE lower(e.name) = 'sara khan' ORDER BY e.id LIMIT 1
), canonical AS (
  SELECT u.id FROM users u JOIN sara s ON s.employee_id = u.employee_id
  ORDER BY (u.id = 'u_hr_manager') DESC, (lower(u.email) = 'sara@oxp.example') DESC, u.id LIMIT 1
), duplicates AS (
  SELECT u.id FROM users u JOIN sara s ON s.employee_id = u.employee_id
  WHERE u.id <> (SELECT id FROM canonical)
)
UPDATE manager_employee_assignments assignment
SET manager_user_id = (SELECT id FROM canonical)
WHERE assignment.manager_user_id IN (SELECT id FROM duplicates)
  AND NOT EXISTS (
    SELECT 1 FROM manager_employee_assignments existing
    WHERE existing.manager_user_id = (SELECT id FROM canonical)
      AND existing.employee_id = assignment.employee_id
  );

WITH sara AS (
  SELECT e.id AS employee_id FROM employees e WHERE lower(e.name) = 'sara khan' ORDER BY e.id LIMIT 1
), canonical AS (
  SELECT u.id FROM users u JOIN sara s ON s.employee_id = u.employee_id
  ORDER BY (u.id = 'u_hr_manager') DESC, (lower(u.email) = 'sara@oxp.example') DESC, u.id LIMIT 1
)
DELETE FROM users u
USING sara s
WHERE u.employee_id = s.employee_id AND u.id <> (SELECT id FROM canonical);

-- Every person who manages somebody in the 300-person organization becomes an
-- available people manager, except accounts with broader admin/payroll roles.
UPDATE users u
SET role_id = 'hr_manager'
WHERE u.employee_id IN (
  SELECT DISTINCT manager_employee_id
  FROM employees
  WHERE manager_employee_id IS NOT NULL
)
AND u.role_id NOT IN ('admin', 'payroll_manager');

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, u.role_id
FROM users u
WHERE u.role_id = 'hr_manager'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Seed existing reporting lines only when an employee has not already been
-- assigned in the manager-team screen. Manual assignments remain authoritative.
INSERT INTO manager_employee_assignments (manager_user_id, employee_id)
SELECT manager_user.id, employee.id
FROM employees employee
JOIN users manager_user ON manager_user.employee_id = employee.manager_employee_id
WHERE manager_user.role_id = 'hr_manager'
ON CONFLICT (employee_id) DO NOTHING;
