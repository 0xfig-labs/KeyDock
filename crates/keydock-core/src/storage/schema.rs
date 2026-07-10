use super::AppStore;
use anyhow::Result;
use rusqlite::params;

impl AppStore {
    /// Versioned schema migration. Each version is tracked in
    /// `schema_migrations` and runs at most once per database.
    /// Destructive migrations (potential data loss) are explicitly
    /// marked — see `migrate_v0_legacy_cleanup`.
    pub(crate) fn migrate(&self) -> Result<()> {
        // V0: handle pre-versioning legacy schema before the tracking
        // table exists.  Only runs on databases that have no
        // schema_migrations table at all.
        self.migrate_v0_legacy_cleanup()?;

        // Ensure the migration tracking table exists.
        self.ensure_schema_migrations_table()?;

        // Run each versioned migration if not yet applied.
        self.run_migration(1, "initial_schema", |s| s.migrate_v1_initial_schema())?;
        self.run_migration(6, "add_preset_includes", |s| {
            s.migrate_v6_add_preset_includes()
        })?;
        self.run_migration(7, "add_secret_fields", |s| s.migrate_v7_add_secret_fields())?;
        self.run_migration(8, "replace_preset_with_preset", |s| {
            s.migrate_v8_replace_preset_with_preset()
        })?;
        self.run_migration(9, "add_preset_id_to_audit_logs", |s| {
            s.migrate_v9_add_preset_id_to_audit_logs()
        })?;

        Ok(())
    }

    // ── migration runner ────────────────────────────────────────────────

    fn ensure_schema_migrations_table(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );",
        )?;
        Ok(())
    }

    fn run_migration(
        &self,
        version: i64,
        name: &str,
        f: impl FnOnce(&Self) -> Result<()>,
    ) -> Result<()> {
        let already_applied: bool = self.conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
            [version],
            |row| row.get::<_, i64>(0),
        )? > 0;

        if already_applied {
            return Ok(());
        }

        f(self)?;

        self.conn.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
            params![version, name, super::now()],
        )?;

        Ok(())
    }

    // ── V0: legacy schema cleanup (destructive, pre-versioning) ──────────

    /// If the database has a `secrets` table that predates the `category`
    /// column, the schema is from an ancient prototype.  Drop and
    /// recreate everything — there is no way to backfill the missing
    /// column at this point.
    ///
    /// This only fires when the database has NOT yet been through the
    /// versioned migration system (no `schema_migrations` table).
    fn migrate_v0_legacy_cleanup(&self) -> Result<()> {
        if self.table_exists("schema_migrations")? {
            return Ok(());
        }
        let exists: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'secrets'",
            [],
            |row| row.get(0),
        )?;
        if exists == 0 {
            return Ok(());
        }
        if self.column_exists("secrets", "category")? {
            return Ok(());
        }
        // Destructive: drop legacy tables before recreating them.
        self.conn.execute_batch(
            "
            PRAGMA foreign_keys = OFF;
            DROP TABLE IF EXISTS preset_variables;
            DROP TABLE IF EXISTS project_bindings;
            DROP TABLE IF EXISTS secret_entries;
            DROP TABLE IF EXISTS keys;
            DROP TABLE IF EXISTS secrets;
            PRAGMA foreign_keys = ON;
            ",
        )?;
        Ok(())
    }

    // ── V1: initial schema ──────────────────────────────────────────────

    fn migrate_v1_initial_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS secrets (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 category TEXT NOT NULL,
                 tags_json TEXT NOT NULL DEFAULT '[]',
                 notes TEXT,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS presets (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 description TEXT,
                 tags_json TEXT NOT NULL DEFAULT '[]',
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS preset_entries (
                 id TEXT PRIMARY KEY,
                 preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
                 secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
                 field_id TEXT NOT NULL REFERENCES secret_fields(id) ON DELETE CASCADE,
                 env_name TEXT NOT NULL,
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL,
                 UNIQUE(preset_id, env_name)
             );
             CREATE TABLE IF NOT EXISTS audit_logs (
                 id TEXT PRIMARY KEY,
                 action TEXT NOT NULL,
                 target_id TEXT,
                 preset_id TEXT,
                 env_name TEXT,
                 created_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_secrets_name_nocase
                 ON secrets(name COLLATE NOCASE);
             CREATE INDEX IF NOT EXISTS idx_preset_entries_preset
                 ON preset_entries(preset_id, sort_order, env_name COLLATE NOCASE);
             CREATE INDEX IF NOT EXISTS idx_preset_entries_lookup
                 ON preset_entries(preset_id, env_name);
             CREATE INDEX IF NOT EXISTS idx_audit_logs_created
                 ON audit_logs(created_at DESC);",
        )?;
        Ok(())
    }

    // ── V6: add preset_includes table ─────────────────────────────────

    fn migrate_v6_add_preset_includes(&self) -> Result<()> {
        self.conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS preset_includes (
                 id TEXT PRIMARY KEY,
                 preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
                 included_preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 created_at TEXT NOT NULL,
                 UNIQUE(preset_id, included_preset_id)
             );
             CREATE INDEX IF NOT EXISTS idx_preset_includes_preset
                 ON preset_includes(preset_id, sort_order);",
        )?;
        Ok(())
    }

    // ── V7: add secret_fields table ───────────────────────────────────

    fn migrate_v7_add_secret_fields(&self) -> Result<()> {
        self.conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE IF NOT EXISTS secret_fields (
                 id TEXT PRIMARY KEY,
                 secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
                 label TEXT NOT NULL,
                 field_type TEXT NOT NULL DEFAULT 'secret',
                 encrypted_value TEXT,
                 sensitive INTEGER NOT NULL DEFAULT 1,
                 env_name TEXT,
                 purpose TEXT,
                 section TEXT,
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 expires_at TEXT,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE INDEX IF NOT EXISTS idx_secret_fields_secret_id ON secret_fields(secret_id);
             CREATE INDEX IF NOT EXISTS idx_secret_fields_env_name ON secret_fields(env_name);
             CREATE INDEX IF NOT EXISTS idx_secret_fields_enabled ON secret_fields(enabled);",
        )?;
        Ok(())
    }

    // ── V8: replace presets with presets ─────────────────────────────
    //
    // For databases created before the preset→preset migration this
    // creates the new tables and removes the old ones.  Fresh databases
    // (V1 already creates presets+preset_entries) are unaffected because
    // the CREATE IF NOT EXISTS is a no-op.

    fn migrate_v8_replace_preset_with_preset(&self) -> Result<()> {
        self.conn.execute_batch(
            "PRAGMA foreign_keys = OFF;
             CREATE TABLE IF NOT EXISTS presets (
                 id TEXT PRIMARY KEY,
                 name TEXT NOT NULL UNIQUE,
                 description TEXT,
                 tags_json TEXT NOT NULL DEFAULT '[]',
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL
             );
             CREATE TABLE IF NOT EXISTS preset_entries (
                 id TEXT PRIMARY KEY,
                 preset_id TEXT NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
                 secret_id TEXT NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
                 field_id TEXT NOT NULL REFERENCES secret_fields(id) ON DELETE CASCADE,
                 env_name TEXT NOT NULL,
                 sort_order INTEGER NOT NULL DEFAULT 0,
                 enabled INTEGER NOT NULL DEFAULT 1,
                 created_at TEXT NOT NULL,
                 updated_at TEXT NOT NULL,
                 UNIQUE(preset_id, env_name)
             );
             CREATE INDEX IF NOT EXISTS idx_preset_entries_preset
                 ON preset_entries(preset_id, sort_order, env_name COLLATE NOCASE);
             CREATE INDEX IF NOT EXISTS idx_preset_entries_lookup
                 ON preset_entries(preset_id, env_name);
             DROP TABLE IF EXISTS preset_variables;
             PRAGMA foreign_keys = ON;",
        )?;
        Ok(())
    }

    // ── V9: add preset_id to audit_logs ─────────────────────────────────
    //
    // Databases created before migration V1 may have an audit_logs table
    // that predates the preset_id column.  Since V1 uses CREATE TABLE IF
    // NOT EXISTS, existing tables are not altered.  This migration fills
    // the gap for databases that have been upgraded across versions.

    fn migrate_v9_add_preset_id_to_audit_logs(&self) -> Result<()> {
        if !self.column_exists("audit_logs", "preset_id")? {
            self.conn
                .execute_batch("ALTER TABLE audit_logs ADD COLUMN preset_id TEXT;")?;
        }
        Ok(())
    }

    // ── helpers ─────────────────────────────────────────────────────────

    fn table_exists(&self, table: &str) -> Result<bool> {
        let count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [table],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    fn column_exists(&self, table: &str, column: &str) -> Result<bool> {
        let mut stmt = self
            .conn
            .prepare(&format!("PRAGMA table_info({})", table))?;
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(columns.iter().any(|c| c == column))
    }
}
