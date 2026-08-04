#[cfg(test)]
use crate::PresetEnv;
use crate::Secret;
use anyhow::{anyhow, Context, Result};
use rusqlite::Connection;
use std::path::PathBuf;
use time::OffsetDateTime;

pub mod audit;
pub mod presets;
pub mod schema;
pub mod secret_fields;
pub mod secrets;
pub mod shell;

// Re-export public free functions from shell sub-module so the crate root can
// still re-export them via `pub use storage::{...}`.
pub use presets::list_preset_templates;
pub use shell::{
    active_env_path, active_preset_path, current_active_preset, deactivate_active_preset,
    format_env, format_shell_exports, install_shell_hook, keydock_config_dir, shell_hook,
    shell_integration_status,
};

pub fn default_database_path() -> Result<PathBuf> {
    if let Ok(path) = std::env::var("KEYDOCK_DB_PATH") {
        return Ok(PathBuf::from(path));
    }

    let base = dirs::data_dir()
        .ok_or_else(|| anyhow!("cannot find platform data directory"))?
        .join("KeyDock");
    std::fs::create_dir_all(&base).context("create KeyDock data directory")?;
    Ok(base.join("keydock.sqlite3"))
}

pub struct AppStore {
    conn: Connection,
    master_key: Vec<u8>,
}

impl AppStore {
    pub fn open(path: PathBuf, master_key: Vec<u8>) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).context("create database parent directory")?;
        }
        let conn = Connection::open(path).context("open sqlite database")?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA cache_size = -64000;
             PRAGMA busy_timeout = 5000;",
        )
        .context("set sqlite pragmas")?;
        let store = Self { conn, master_key };
        store.migrate()?;
        Ok(store)
    }

    pub fn open_default() -> Result<Self> {
        let path = default_database_path()?;
        let password = std::env::var("KEYDOCK_MASTER_PASSWORD")
            .map_err(|_| anyhow!("KEYDOCK_MASTER_PASSWORD is required for CLI access"))?;
        Self::open(path.clone(), crate::unlock_vault(&path, &password)?)
    }

    pub fn resolve_secret(&self, id_or_name: &str) -> Result<Secret> {
        self.get_secret_by_id(id_or_name)?
            .or(self.get_secret_by_name(id_or_name)?)
            .ok_or_else(|| anyhow!("secret not found: {id_or_name}"))
    }
}

/// Execute `f` inside a SQLite transaction (BEGIN/COMMIT).
/// On error the transaction is rolled back.
pub(crate) fn with_tx<T>(
    conn: &Connection,
    f: impl FnOnce(&Connection) -> anyhow::Result<T>,
) -> anyhow::Result<T> {
    conn.execute_batch("BEGIN")?;
    match f(conn) {
        Ok(val) => {
            conn.execute_batch("COMMIT")?;
            Ok(val)
        }
        Err(e) => {
            conn.execute_batch("ROLLBACK").ok();
            Err(e)
        }
    }
}

/// Write an audit log row on the given connection (used inside transactions).
pub(crate) fn log_audit(
    conn: &Connection,
    action: &str,
    target_id: Option<&str>,
    preset_id: Option<&str>,
    env_name: Option<&str>,
) -> anyhow::Result<()> {
    use uuid::Uuid;
    conn.execute(
        "INSERT INTO audit_logs (id, action, target_id, preset_id, env_name, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            action,
            target_id,
            preset_id,
            env_name,
            now(),
        ],
    )?;
    Ok(())
}

/// Mask a value for display: show first 4 and last 4 characters,
/// with `••••` in between.  Values ≤ 8 characters are entirely
/// replaced with `••••` to prevent short tokens / PINs from leaking.
pub(crate) fn mask_value(value: &str) -> String {
    let len = value.len();
    if len <= 8 {
        return "••••".to_string();
    }
    format!("{}••••{}", &value[..4], &value[len - 4..])
}

pub(crate) fn now() -> String {
    OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .expect("format current time")
}

pub(crate) fn validate_env_name(name: &str) -> Result<()> {
    let valid = !name.is_empty()
        && name
            .chars()
            .enumerate()
            .all(|(i, c)| c == '_' || c.is_ascii_uppercase() || c.is_ascii_digit() && i > 0);
    if valid {
        Ok(())
    } else {
        Err(anyhow!("invalid env name: {name}"))
    }
}

pub(crate) fn shell_escape_env(value: &str) -> String {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.' | '/' | ':'))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

pub(crate) fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

#[cfg(test)]
pub fn env_vec_to_map(env: Vec<PresetEnv>) -> std::collections::BTreeMap<String, String> {
    env.into_iter()
        .map(|item| (item.env_name, item.value))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{SecretCategory, SecretFieldInput, SecretFieldType, SecretInput};
    use uuid::Uuid;

    fn store() -> AppStore {
        let path = std::env::temp_dir().join(format!("keydock-test-{}.sqlite3", Uuid::new_v4()));
        AppStore::open(path, vec![3_u8; 32]).unwrap()
    }

    #[test]
    fn preset_env_mapping_resolves_field_plaintext() {
        let store = store();
        store
            .create_secret(SecretInput {
                name: "openrouter".into(),
                category: SecretCategory::AI,
                tags: vec!["ai".into()],
                notes: None,
            })
            .unwrap();
        let field = store
            .create_secret_field(
                "openrouter",
                SecretFieldInput {
                    label: "API Key".into(),
                    field_type: SecretFieldType::Secret,
                    value: Some("sk-test".into()),
                    sensitive: true,
                    env_name: Some("OPENAI_API_KEY".into()),
                    purpose: None,
                    section: None,
                    sort_order: None,
                    enabled: true,
                    expires_at: None,
                },
            )
            .unwrap();
        store
            .create_preset(crate::PresetInput {
                name: "startup".into(),
                description: None,
            })
            .unwrap();
        store
            .add_preset_entry("startup", &field.id, Some("OPENAI_API_KEY"))
            .unwrap();
        let env = env_vec_to_map(store.resolve_preset_env("startup").unwrap());
        assert_eq!(env.get("OPENAI_API_KEY").unwrap(), "sk-test");
    }

    #[test]
    fn deleting_secret_removes_preset_entries() {
        let store = store();
        let secret = store
            .create_secret(SecretInput {
                name: "github".into(),
                category: SecretCategory::DevTool,
                tags: vec![],
                notes: None,
            })
            .unwrap();
        let field = store
            .create_secret_field(
                "github",
                SecretFieldInput {
                    label: "PAT".into(),
                    field_type: SecretFieldType::Secret,
                    value: Some("ghp_test".into()),
                    sensitive: true,
                    env_name: Some("GITHUB_TOKEN".into()),
                    purpose: None,
                    section: None,
                    sort_order: None,
                    enabled: true,
                    expires_at: None,
                },
            )
            .unwrap();
        store
            .create_preset(crate::PresetInput {
                name: "personal".into(),
                description: None,
            })
            .unwrap();
        store
            .add_preset_entry("personal", &field.id, Some("GITHUB_TOKEN"))
            .unwrap();
        store.delete_secret(&secret.id).unwrap();
        assert!(store.list_preset_entries("personal").unwrap().is_empty());
    }

    #[test]
    fn preset_crud_works() {
        let store = store();
        store
            .create_preset(crate::PresetInput {
                name: "dev".into(),
                description: Some("Development preset".into()),
            })
            .unwrap();
        let presets = store.list_presets().unwrap();
        assert_eq!(presets.len(), 1);
        assert_eq!(presets[0].name, "dev");
        assert_eq!(
            presets[0].description.as_deref(),
            Some("Development preset")
        );

        store.delete_preset("dev").unwrap();
        assert!(store.list_presets().unwrap().is_empty());
    }

    #[test]
    fn preset_composition_resolves_env() {
        let store = store();

        store
            .create_secret(SecretInput {
                name: "openai".into(),
                category: SecretCategory::AI,
                tags: vec![],
                notes: None,
            })
            .unwrap();
        let api_key_field = store
            .create_secret_field(
                "openai",
                SecretFieldInput {
                    label: "API Key".into(),
                    field_type: SecretFieldType::Secret,
                    value: Some("sk-base".into()),
                    sensitive: true,
                    env_name: Some("OPENAI_API_KEY".into()),
                    purpose: None,
                    section: None,
                    sort_order: None,
                    enabled: true,
                    expires_at: None,
                },
            )
            .unwrap();

        store
            .create_secret(SecretInput {
                name: "cloudflare".into(),
                category: SecretCategory::Cloud,
                tags: vec![],
                notes: None,
            })
            .unwrap();
        let cf_token_field = store
            .create_secret_field(
                "cloudflare",
                SecretFieldInput {
                    label: "API Token".into(),
                    field_type: SecretFieldType::Secret,
                    value: Some("cf-token".into()),
                    sensitive: true,
                    env_name: Some("CLOUDFLARE_API_TOKEN".into()),
                    purpose: None,
                    section: None,
                    sort_order: None,
                    enabled: true,
                    expires_at: None,
                },
            )
            .unwrap();

        store
            .create_preset(crate::PresetInput {
                name: "ai-base".into(),
                description: None,
            })
            .unwrap();
        store
            .create_preset(crate::PresetInput {
                name: "cloud-base".into(),
                description: None,
            })
            .unwrap();

        store
            .add_preset_entry("ai-base", &api_key_field.id, Some("OPENAI_API_KEY"))
            .unwrap();
        store
            .add_preset_entry(
                "cloud-base",
                &cf_token_field.id,
                Some("CLOUDFLARE_API_TOKEN"),
            )
            .unwrap();

        store
            .create_preset(crate::PresetInput {
                name: "fullstack".into(),
                description: None,
            })
            .unwrap();

        store.include_preset("fullstack", "ai-base").unwrap();
        store.include_preset("fullstack", "cloud-base").unwrap();

        let env = env_vec_to_map(store.resolve_preset_env("fullstack").unwrap());
        assert_eq!(env.get("OPENAI_API_KEY").unwrap(), "sk-base");
        assert_eq!(env.get("CLOUDFLARE_API_TOKEN").unwrap(), "cf-token");
    }
}
