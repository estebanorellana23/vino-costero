-- Apply explicitly after backup and after 001-field-history.sql.
-- Existing JWTs become invalid; users must sign in again.
ALTER TABLE usuario ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0;
