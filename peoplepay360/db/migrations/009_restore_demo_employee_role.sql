UPDATE users
SET role_id = 'employee'
WHERE id = 'u_employee';

DELETE FROM user_roles
WHERE user_id = 'u_employee' AND role_id <> 'employee';

INSERT INTO user_roles (user_id, role_id)
VALUES ('u_employee', 'employee')
ON CONFLICT (user_id, role_id) DO NOTHING;

DELETE FROM manager_employee_assignments
WHERE manager_user_id = 'u_employee';
