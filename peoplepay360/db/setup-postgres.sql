-- PostgreSQL Setup Script for PeoplePay360
-- Execute this script in pgAdmin 4 Query Tool on your database (e.g. peoplepay360)

-- 1. Create workspace table
CREATE TABLE IF NOT EXISTS workspace (
    id VARCHAR(255) PRIMARY KEY,
    data TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0
);

-- 2. Verify table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workspace';
