-- Migration 002: add analysis_report column to user_documents
-- Run via: npm run migrate:analysis  (tsx src/db/run-migration.ts 002_analysis_report.sql)

ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS analysis_report JSONB;
