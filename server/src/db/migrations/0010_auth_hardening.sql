-- Auth hardening: add email column to players for password reset flow
-- Migration: 0010_auth_hardening

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
