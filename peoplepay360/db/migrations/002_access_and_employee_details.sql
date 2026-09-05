ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_employee_id VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_email VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS personal_phone VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS government_id_type VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS government_id_number VARCHAR(150);

UPDATE employees employee
SET manager_employee_id = manager_record.id
FROM employees manager_record
WHERE employee.manager_employee_id IS NULL
  AND employee.manager IS NOT NULL
  AND LOWER(TRIM(employee.manager)) = LOWER(TRIM(manager_record.name))
  AND employee.id <> manager_record.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_manager_employee_id_fkey'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_manager_employee_id_fkey
      FOREIGN KEY (manager_employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id FROM users
ON CONFLICT (user_id, role_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(80) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id, expires_at DESC);