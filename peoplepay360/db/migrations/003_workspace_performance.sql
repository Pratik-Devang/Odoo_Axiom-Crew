-- Index the date and period filters used by the scoped workspace API.
CREATE INDEX IF NOT EXISTS idx_attendance_date_employee
  ON attendance (date, employee_id);

CREATE INDEX IF NOT EXISTS idx_contracts_employee_dates
  ON contracts (employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates
  ON leave_requests (employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payruns_period_status
  ON payruns (period, status);
