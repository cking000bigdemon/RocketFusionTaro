-- Migration: Add is_guest column to users table for guest login functionality
-- Date: 2025-08-27
-- Description: Adds boolean column to identify guest users vs registered users

-- Step 1: Add is_guest column with default false
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Create index for faster guest user queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest) WHERE is_guest = true;

-- Verification query:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'is_guest';
-- 
-- Expected result:
-- column_name | data_type | is_nullable | column_default
-- is_guest    | boolean   | NO          | false

-- Rollback SQL (if needed):
-- DROP INDEX IF EXISTS idx_users_is_guest;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_guest;