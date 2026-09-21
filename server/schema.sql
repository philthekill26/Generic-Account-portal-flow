CREATE TABLE portal_sessions (
 token_hash TEXT PRIMARY KEY, role TEXT NOT NULL, expires INTEGER NOT NULL,
 fingerprint TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'active', period INTEGER
);
CREATE TABLE portal_surveys (
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, subscription TEXT NOT NULL,
 reason_id TEXT NOT NULL, reason_name TEXT NOT NULL, comment TEXT NOT NULL,
 language TEXT NOT NULL, period INTEGER NOT NULL, created TEXT NOT NULL,
 status TEXT NOT NULL, api_status INTEGER, error TEXT, source TEXT NOT NULL
);
CREATE INDEX survey_by_session ON portal_surveys(token_hash, created);
CREATE TABLE portal_locks (subscription TEXT PRIMARY KEY, acquired INTEGER NOT NULL);
CREATE TABLE portal_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
