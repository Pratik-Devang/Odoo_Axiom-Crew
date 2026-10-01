CREATE TABLE IF NOT EXISTS manager_employee_assignments (
  manager_user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_user_id, employee_id),
  CONSTRAINT uq_manager_assignment_employee UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_employee_assignments_manager
  ON manager_employee_assignments(manager_user_id);
