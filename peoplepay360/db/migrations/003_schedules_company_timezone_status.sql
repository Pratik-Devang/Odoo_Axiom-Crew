-- Migration: 003_schedules_company_timezone_status.sql
-- Add company, timezone, and status columns to schedules table

ALTER TABLE schedules ADD COLUMN IF NOT EXISTS company VARCHAR(100) NOT NULL DEFAULT 'My Company';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'Company timezone';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Active';

-- Update existing records if necessary
UPDATE schedules SET company = 'My Company' WHERE company IS NULL OR company = '';
UPDATE schedules SET timezone = 'Company timezone' WHERE timezone IS NULL OR timezone = '';
UPDATE schedules SET status = 'Active' WHERE status IS NULL OR status = '';

