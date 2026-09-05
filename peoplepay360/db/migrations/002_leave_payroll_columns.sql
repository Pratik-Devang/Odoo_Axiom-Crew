-- Migration 002: Add missing columns for leave workflows, allocations, and payroll
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS approval_workflow VARCHAR(50) NOT NULL DEFAULT 'HR Approval';
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS payroll_impact VARCHAR(50) NOT NULL DEFAULT 'Paid';
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS payroll_work_entry VARCHAR(255) DEFAULT '';
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS display_color VARCHAR(50) DEFAULT 'Blue';
ALTER TABLE leave_types ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approver VARCHAR(255) DEFAULT '';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS allocation_id VARCHAR(255) DEFAULT '';

ALTER TABLE leave_allocations ADD COLUMN IF NOT EXISTS approver VARCHAR(255) DEFAULT '';

ALTER TABLE payruns ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS overtime NUMERIC(5,2) DEFAULT 0;
