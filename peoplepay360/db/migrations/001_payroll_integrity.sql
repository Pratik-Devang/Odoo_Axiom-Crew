-- Keep the payroll scope explicit so PostgreSQL can enforce one employee per period.
ALTER TABLE payrun_employees ADD COLUMN IF NOT EXISTS period VARCHAR(10);

UPDATE payrun_employees AS membership
SET period = payrun.period
FROM payruns AS payrun
WHERE payrun.id = membership.payrun_id
  AND membership.period IS DISTINCT FROM payrun.period;

ALTER TABLE payrun_employees ALTER COLUMN period SET NOT NULL;

-- Draft payslips are disposable calculation results. They must be recomputed.
DELETE FROM payslips AS slip
USING payruns AS payrun
WHERE payrun.id = slip.payrun_id
  AND payrun.status = 'Draft';

-- If older application versions placed an employee in multiple runs for one
-- period, retain the most finalized membership and remove the others.
CREATE TEMP TABLE duplicate_payrun_memberships ON COMMIT DROP AS
SELECT payrun_id, employee_id
FROM (
    SELECT
        membership.payrun_id,
        membership.employee_id,
        ROW_NUMBER() OVER (
            PARTITION BY membership.employee_id, membership.period
            ORDER BY
                CASE payrun.status
                    WHEN 'Paid' THEN 4
                    WHEN 'Validated' THEN 3
                    WHEN 'Computed' THEN 2
                    ELSE 1
                END DESC,
                payrun.created_at DESC,
                payrun.id DESC
        ) AS position
    FROM payrun_employees AS membership
    JOIN payruns AS payrun ON payrun.id = membership.payrun_id
) AS ranked
WHERE position > 1;

DELETE FROM payslips AS slip
USING duplicate_payrun_memberships AS duplicate
WHERE slip.payrun_id = duplicate.payrun_id
  AND slip.employee_id = duplicate.employee_id;

DELETE FROM payrun_employees AS membership
USING duplicate_payrun_memberships AS duplicate
WHERE membership.payrun_id = duplicate.payrun_id
  AND membership.employee_id = duplicate.employee_id;

DELETE FROM payruns AS payrun
WHERE payrun.status = 'Draft'
  AND NOT EXISTS (
      SELECT 1 FROM payrun_employees AS membership WHERE membership.payrun_id = payrun.id
  );

-- Collapse repeated UUID versions left by old recomputations. Finalized and
-- newest records win, while validated/paid payroll remains immutable.
WITH duplicate_slips AS (
    SELECT id
    FROM (
        SELECT
            slip.id,
            ROW_NUMBER() OVER (
                PARTITION BY slip.employee_id, slip.period
                ORDER BY
                    CASE payrun.status
                        WHEN 'Paid' THEN 4
                        WHEN 'Validated' THEN 3
                        WHEN 'Computed' THEN 2
                        ELSE 1
                    END DESC,
                    slip.created_at DESC,
                    slip.id DESC
            ) AS position
        FROM payslips AS slip
        JOIN payruns AS payrun ON payrun.id = slip.payrun_id
    ) AS ranked
    WHERE position > 1
)
DELETE FROM payslips AS slip
USING duplicate_slips AS duplicate
WHERE slip.id = duplicate.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payrun_employee_period
    ON payrun_employees (employee_id, period);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payslip_payrun_employee
    ON payslips (payrun_id, employee_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payslip_employee_period
    ON payslips (employee_id, period);
