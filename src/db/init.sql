-- Database initialization script
-- This runs when the postgres container is first created

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a schema for the application
CREATE SCHEMA IF NOT EXISTS app;

-- Example table structure (customize for your project)
-- DELETE THIS AND REPLACE WITH YOUR ACTUAL SCHEMA
CREATE TABLE IF NOT EXISTS app.migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any initial seed data or setup here
