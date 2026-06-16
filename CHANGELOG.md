# Changelog

## 0.6.5 - 2026-06-16

### Features
- Derive default ENV name from secret title when adding an environment field — only fills when empty, keeps template defaults like OPENAI_API_KEY as-is
- Add silent copy for ENV name badge — click to copy env name without toast notification

### Fixes
- Show GitHub Releases download link when in-app update fails instead of generic error
- Clean up old releases on CI — keep only the latest release assets

## 0.6.4 - 2026-06-12

### Fixes
- Fix download progress stuck at 0% during update — track chunk lengths and compute real percentage
- Show detailed error messages in update UI instead of generic text

## 0.6.3 - 2026-06-11

### Features
- Add expiration date picker (Calendar+Popover) for ENV-type secret fields — pick a date when the key expires
- Always show expiration date in field rows (amber for active, red for expired)
- Add 7-day expiry warning card on the dashboard with per-field details
- Add inline env name editing for preset entries

## 0.6.2 - 2026-06-08

### Fixes
- Fix in-app update check failure: regenerate Tauri signing keypair with password and set up CI release signing.

## 0.6.1 - 2026-06-08

### Fixes
- Fix database migration gap: add missing `preset_id` column to `audit_logs` for databases upgraded from older versions, preventing crash on audit log view.

## 0.6.0 - 2026-06-08

### Features
- Replace the old workspace model with reusable Presets for composing and activating environment variable sets.
- Add secret fields and preset entries so encrypted secret values can be mapped directly to env vars.
- Add Presets UI, preset composition, activation/deactivation, preview, and one-shot `keydock run` injection flows.
- Refresh the landing page SEO and copy around the local API key vault, reusable env presets, and AI-agent-safe scoped injection.

### Refactor
- Remove legacy Key and Workspace frontend/backend code paths and align audit/env naming around Presets.
- Remove product-facing Workspace terminology from docs, app copy, and website copy.

### Fixes
- Refresh active preset env exports after preset mappings or linked secret fields change.
- Fix FAQ accordion lint issue by measuring content height outside render.

## 0.5.4 - 2026-06-06

### Fixes
- Fix DMG bundling failure in CI by removing TAURI_BUNDLER_DMG_IGNORE_CI env var

## 0.5.0 - 2026-06-04

### Features
- Key expiration support — set expiry dates on API keys and see expiring/expired keys on the dashboard
- In-app update checker — check for new versions and install updates from the Settings tab
- Dashboard expiring keys alert — highlights keys expiring within 7 days or already expired
- Secret metadata fields — add Dashboard URL, Docs URL, and Login URL to service groups
- Open external links — click URLs to open in your default browser

### Fixes
- Remove stale `modelName` field from secret model and presets

### Performance
- Storage refactor with transactional audit logging and N+1 query fixes

## 0.4.1 - 2026-06-03

### Fixes
- Fix TypeScript build errors: missing prop destructuring and undefined error handler in `DeletePresetButton`

## 0.4.0 - 2026-06-03

### Features
- Auto-create a "default" preset for first-time users when setting up the vault
- New confirmation dialog when deleting an active preset with extra warning

### Fixes
- Delete preset now properly refreshes the preset list and reactivates the selection after deletion
- Deleting the active preset automatically deactivates the environment first

### Performance
- Remove redundant `dir` prop references from Input and Textarea components
