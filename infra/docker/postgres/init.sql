-- CodeLens PostgreSQL Initialization Script
-- Executed once upon container initialization in /docker-entrypoint-initdb.d/

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Create Application Role for Row-Level Security (RLS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'codelens_app') THEN
    CREATE ROLE codelens_app WITH LOGIN PASSWORD 'changeme_in_env';
  END IF;
END
$$;

-- 3. Grant schema usage and future privileges to application role
GRANT USAGE ON SCHEMA public TO codelens_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO codelens_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO codelens_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO codelens_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO codelens_app;
