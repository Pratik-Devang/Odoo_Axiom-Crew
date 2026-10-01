-- The employee demo login must open John Dsouza's own records.
UPDATE users demo_employee
SET employee_id = john.id,
    name = john.name
FROM employees john
WHERE demo_employee.id = 'u_employee'
  AND lower(john.name) = 'john dsouza';

DELETE FROM users duplicate_user
USING users demo_employee
WHERE demo_employee.id = 'u_employee'
  AND duplicate_user.employee_id = demo_employee.employee_id
  AND duplicate_user.id <> demo_employee.id;
