-- ==============================================================================
-- TradeNexus Relational Database Schema (PostgreSQL)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Media Files Table (Relational Media & S3/CloudFront Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL UNIQUE,
    s3_url VARCHAR(1000) NOT NULL,
    cdn_url VARCHAR(1000) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    entity_type VARCHAR(50) DEFAULT 'GENERAL',    -- e.g. 'AVATAR', 'LEAD_ATTACHMENT', 'PAYSLIP', 'CALL_RECORDING'
    entity_id VARCHAR(100),                       -- Foreign key / ID referencing the associated record
    uploaded_by VARCHAR(100),                     -- User or Employee ID who uploaded the file
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup indexes for relational queries
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON media_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_files_uploader ON media_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Core Tables Structure (PostgreSQL Compatible)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employee_profiles (
    id VARCHAR(100) PRIMARY KEY,
    emp_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    team_leader_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    join_date VARCHAR(50) NOT NULL,
    blood_group VARCHAR(10) NOT NULL,
    face_id_status VARCHAR(50) NOT NULL DEFAULT 'NOT_CHECKED_IN',
    avatar_media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    check_in_time VARCHAR(50) DEFAULT '',
    total_leave_balance NUMERIC(4, 1) NOT NULL DEFAULT 14,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(100) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    timestamp VARCHAR(50) NOT NULL,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    outcome VARCHAR(50) NOT NULL,
    notes TEXT DEFAULT '',
    follow_up_date VARCHAR(50),
    recording_media_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_leads (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    temperature VARCHAR(20) NOT NULL DEFAULT 'WARM',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    due_time VARCHAR(50),
    deal_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    requirement TEXT DEFAULT '',
    last_contacted VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
