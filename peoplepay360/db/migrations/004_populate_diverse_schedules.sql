-- Migration: 004_populate_diverse_schedules.sql
-- Populate working schedules with diverse realistic operational schedules

INSERT INTO schedules (id, name, schedule_type, days, work_rows, start_time, end_time, break_hours, weekly_hours, company, timezone, status)
VALUES
  (
    'sch1',
    'Standard Full-Time (40h)',
    'Fixed',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    '[
      {"id":"Monday","day":"Monday","working":true,"start":"09:00","end":"18:00","breakHours":1},
      {"id":"Tuesday","day":"Tuesday","working":true,"start":"09:00","end":"18:00","breakHours":1},
      {"id":"Wednesday","day":"Wednesday","working":true,"start":"09:00","end":"18:00","breakHours":1},
      {"id":"Thursday","day":"Thursday","working":true,"start":"09:00","end":"18:00","breakHours":1},
      {"id":"Friday","day":"Friday","working":true,"start":"09:00","end":"18:00","breakHours":1}
    ]'::jsonb,
    '09:00', '18:00', 1.0, 40.0,
    'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'
  ),
  (
    'sch2',
    'Night Shift NOC (35h)',
    'Shift',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    '[
      {"id":"Monday","day":"Monday","working":true,"start":"22:00","end":"06:00","breakHours":1},
      {"id":"Tuesday","day":"Tuesday","working":true,"start":"22:00","end":"06:00","breakHours":1},
      {"id":"Wednesday","day":"Wednesday","working":true,"start":"22:00","end":"06:00","breakHours":1},
      {"id":"Thursday","day":"Thursday","working":true,"start":"22:00","end":"06:00","breakHours":1},
      {"id":"Friday","day":"Friday","working":true,"start":"22:00","end":"06:00","breakHours":1}
    ]'::jsonb,
    '22:00', '06:00', 1.0, 35.0,
    'Axiom Crew Global Ops', 'Asia/Kolkata (IST)', 'Active'
  ),
  (
    'sch3',
    'Retail & Weekend Shift (32h)',
    'Shift',
    '["Thursday", "Friday", "Saturday", "Sunday"]'::jsonb,
    '[
      {"id":"Thursday","day":"Thursday","working":true,"start":"10:00","end":"19:00","breakHours":1},
      {"id":"Friday","day":"Friday","working":true,"start":"10:00","end":"19:00","breakHours":1},
      {"id":"Saturday","day":"Saturday","working":true,"start":"10:00","end":"19:00","breakHours":1},
      {"id":"Sunday","day":"Sunday","working":true,"start":"10:00","end":"19:00","breakHours":1}
    ]'::jsonb,
    '10:00', '19:00', 1.0, 32.0,
    'Axiom Crew Retail', 'Asia/Kolkata (IST)', 'Active'
  ),
  (
    'sch4',
    'Flexible Hybrid 4-Day (36h)',
    'Flexible',
    '["Monday", "Tuesday", "Wednesday", "Thursday"]'::jsonb,
    '[
      {"id":"Monday","day":"Monday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},
      {"id":"Tuesday","day":"Tuesday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},
      {"id":"Wednesday","day":"Wednesday","working":true,"start":"08:30","end":"18:00","breakHours":0.5},
      {"id":"Thursday","day":"Thursday","working":true,"start":"08:30","end":"18:00","breakHours":0.5}
    ]'::jsonb,
    '08:30', '18:00', 0.5, 36.0,
    'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'
  ),
  (
    'sch5',
    'Morning Part-Time (20h)',
    'Fixed',
    '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    '[
      {"id":"Monday","day":"Monday","working":true,"start":"09:00","end":"13:00","breakHours":0},
      {"id":"Tuesday","day":"Tuesday","working":true,"start":"09:00","end":"13:00","breakHours":0},
      {"id":"Wednesday","day":"Wednesday","working":true,"start":"09:00","end":"13:00","breakHours":0},
      {"id":"Thursday","day":"Thursday","working":true,"start":"09:00","end":"13:00","breakHours":0},
      {"id":"Friday","day":"Friday","working":true,"start":"09:00","end":"13:00","breakHours":0}
    ]'::jsonb,
    '09:00', '13:00', 0.0, 20.0,
    'Axiom Crew Tech Pvt Ltd', 'Asia/Kolkata (IST)', 'Active'
  ),
  (
    'sch6',
    'Seasonal Logistics Standby (18h)',
    'Flexible',
    '["Friday", "Saturday", "Sunday"]'::jsonb,
    '[
      {"id":"Friday","day":"Friday","working":true,"start":"12:00","end":"18:30","breakHours":0.5},
      {"id":"Saturday","day":"Saturday","working":true,"start":"12:00","end":"18:30","breakHours":0.5},
      {"id":"Sunday","day":"Sunday","working":true,"start":"12:00","end":"18:30","breakHours":0.5}
    ]'::jsonb,
    '12:00', '18:30', 0.5, 18.0,
    'Axiom Crew Logistics', 'Asia/Kolkata (IST)', 'Inactive'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  schedule_type = EXCLUDED.schedule_type,
  days = EXCLUDED.days,
  work_rows = EXCLUDED.work_rows,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  break_hours = EXCLUDED.break_hours,
  weekly_hours = EXCLUDED.weekly_hours,
  company = EXCLUDED.company,
  timezone = EXCLUDED.timezone,
  status = EXCLUDED.status;

-- Distribute employees across schedules
UPDATE employees SET schedule_id = 'sch4' WHERE id IN ('e2', 'e8');
UPDATE employees SET schedule_id = 'sch3' WHERE id IN ('e4', 'e9');
UPDATE employees SET schedule_id = 'sch2' WHERE id IN ('e7', 'e10');
UPDATE employees SET schedule_id = 'sch5' WHERE id = 'e11';

-- Distribute contracts across schedules
UPDATE contracts SET schedule_id = 'sch4' WHERE employee_id IN ('e2', 'e8');
UPDATE contracts SET schedule_id = 'sch3' WHERE employee_id IN ('e4', 'e9');
UPDATE contracts SET schedule_id = 'sch2' WHERE employee_id IN ('e7', 'e10');
UPDATE contracts SET schedule_id = 'sch5' WHERE employee_id = 'e11';

