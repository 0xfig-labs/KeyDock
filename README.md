<p align="center">
  <img src="public/icon.png" alt="KeyDock logo" width="96" height="96" />
</p>

<h1 align="center">KeyDock</h1>

<p align="center">
  <strong>Reusable env presets for AI-era developers.</strong>
  <br />
  Store API keys locally, compose them into presets, and activate one global env set for all new terminals.
</p>

<p align="center">
  <a href="README.md">English</a>
  ·
  <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-MVP-7c3aed?style=flat-square" />
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-10b981?style=flat-square" />
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-v2-24c8db?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb?style=flat-square" />
  <img alt="Rust" src="https://img.shields.io/badge/Rust-core-f97316?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-111827?style=flat-square" />
</p>

---

## English

> KeyDock is a **local-first vault for developer API keys**, with activatable env presets. Store secrets locally, compose them into reusable presets, and activate one global env set for all new terminals.

> **License:** KeyDock is dual-licensed: [AGPLv3](LICENSE) for open-source use, or a [commercial license](COMMERCIAL-LICENSE.md) for use that cannot comply with AGPLv3.

KeyDock is not trying to replace enterprise SecretOps platforms. It focuses on the developer workstation layer: solo developers, small teams, and AI-assisted coding workflows where `.env` sprawl and global shell exports are too easy to leak.

### Why KeyDock?

Modern developer workflows are full of secrets: AI provider keys, proxy URLs, account IDs, cloud tokens, search APIs, and per-client credentials. Copying them between `.env` files is fragile; exporting them globally is risky.

KeyDock gives you a safer loop:

1. Store secrets in a local encrypted vault.
2. Create presets from templates (OpenAI, Anthropic, Cloudflare, Vercel, Supabase, Stripe, etc.).
3. Compose presets together — `fullstack-dev` includes `ai-dev` and `cloud-deploy`.
4. Activate one preset, and every new terminal inherits the same trusted env vars.

The next product direction is **agent-safe secret injection**: give Codex, Claude Code, Cursor, scripts, and dev servers only the scoped variables they need for one command, with redaction and local auditability as the trust layer.

### Highlights

| Capability | What it does |
| --- | --- |
| **Local encrypted vault** | Keeps secrets on your machine with Argon2id + ChaCha20Poly1305. |
| **Preset templates** | Built-in templates for OpenAI, Anthropic, Cloudflare, Vercel, Supabase, Stripe, and more. |
| **Preset composition** | Combine presets — `fullstack-dev` includes `ai-dev` + `cloud-deploy`. |
| **Preset activation** | Activate one preset for all new terminals. No more `.env` sprawl. |
| **One-shot command injection** | Run a command with a preset's env vars without changing global shell state. |
| **Desktop control center** | Tauri + React UI for dashboard, secrets, presets, audit, and settings. |
| **Audit visibility** | Tracks sensitive actions such as reveal, copy, export, and mutations. |
| **Shell integration** | Generates hooks for `zsh` and `bash`. |
| **Bilingual UI foundation** | Includes English and Chinese locale files powered by i18next. |
| **AI-agent-safe direction** | Roadmap focus: scoped injection, output redaction, and command-level audit trails. |

### How it feels

```bash
# Activate a preset for future shells
keydock preset activate fullstack-dev

# Check what is currently active
keydock preset current

# Preview what env vars a preset will export
keydock preset preview fullstack-dev

# Preview what env vars a command would receive, without executing
keydock plan fullstack-dev -- bun run dev

# Run a command with a preset injected just for this process
keydock run fullstack-dev -- bun run dev

# Clean up active preset cache
keydock preset deactivate
```

### Project architecture

```text
KeyDock
├─ src/                  # React desktop UI
│  ├─ components/         # Dashboard, secrets, presets, audit, settings
│  ├─ hooks/              # Vault, secrets, presets, clipboard, theme, i18n
│  ├─ i18n/               # English / Chinese locale resources
│  └─ lib/tauri.ts        # Typed frontend bridge to Tauri commands
├─ src-tauri/             # Tauri shell and native command handlers
├─ crates/keydock-core/   # Vault, crypto, storage, models, preset env logic
└─ crates/keydock-cli/    # `keydock` command-line interface
```

### Quick start

#### Install the app (macOS)

Download the **universal macOS DMG** from [GitHub Releases](https://github.com/0xfig-labs/KeyDock/releases/latest). It runs natively on both Apple Silicon and Intel Macs.

Current builds are ad-hoc signed, not notarized. If macOS blocks the first launch, move KeyDock to **Applications**, then Control-click it, choose **Open**, and confirm. You only need to do this once.

KeyDock stores your vault locally. It does not include analytics; checking for app updates contacts the configured GitHub Releases endpoint. Activating a preset creates a local plaintext environment-variable cache—prefer `keydock run <preset> -- <cmd>` for command-scoped access.

#### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install)
- Platform requirements for [Tauri v2](https://tauri.app/)

#### Install and run

```bash
bun install
bun run tauri dev
```

#### Build frontend assets

```bash
bun run build
```

#### Run Rust tests

```bash
cargo test
```

#### Inspect the CLI

```bash
cargo run -p keydock-cli -- --help
```

### CLI reference

```bash
keydock preset templates            # List available preset templates
keydock preset list                 # List all presets
keydock preset show <preset>        # Show preset details
keydock preset preview <preset>     # Preview env vars without activating
keydock preset activate <preset>    # Activate preset for new shells
keydock preset current              # Show the active preset
keydock plan <preset> [-- <cmd>]    # Preview env vars without executing
keydock preset deactivate           # Remove the active preset cache
keydock hook <zsh|bash>             # Print shell hook code
keydock open                        # Open the KeyDock desktop app on macOS
keydock run <preset> -- <cmd>       # Run a command with preset env vars
```

### Security model

KeyDock is designed as a **local-first** vault:

- A master password derives a key with **Argon2id**.
- A local data-encryption key is decrypted after unlock.
- The decrypted key stays in app memory while the vault is unlocked.
- Preset activation writes a plaintext env cache so new shells can load mapped variables.
- One-shot command injection avoids polluting the global shell and is the preferred path for AI-agent or automation workflows.
- Touch ID / passkey unlock is planned as a convenience path, not the root trust anchor.

> Treat activated preset env caches like any other plaintext shell secret: convenient, local, and intentionally short-lived in your workflow. KeyDock does not make this cache swap-proof.

For AI coding agents, prefer `keydock run <preset> -- <cmd>` over globally exporting secrets. The intended trust boundary is command-scoped access, not “the agent can read the whole shell environment”.

### Current scope

Implemented / in progress:

- Local encrypted secret storage
- Preset templates (OpenAI, Anthropic, Cloudflare, Vercel, Supabase, Stripe, etc.)
- Preset composition (include other presets)
- Preset activation and deactivation
- CLI preset management and one-shot command injection
- Tauri desktop UI
- Quick copy formats
- Audit log UI
- English / Chinese app localization resources

Deferred:

- Agent-safe scoped secret injection presets
- Output redaction for command logs
- Local secret health checks
- Repo / agent config scanner for leaked secrets
- Local HTTP API
- Cloud sync
- Team sharing
- RBAC
- Plugin system
- Automatic preset switching

### Roadmap focus

#### v0.6: Launch-ready developer workflow

- Keep all version metadata and release/update URLs aligned with the `0xfig-labs/KeyDock` repository.
- Improve first-run onboarding: create vault, add a first secret from template, create preset, activate it.
- Add screenshot / GIF slots to the website for vault UI, preset composition, and CLI injection.
- Document unsigned/ad-hoc macOS distribution clearly while preparing Developer ID signing and notarization.

#### v0.7: AI-agent-safe mode

- Command-scoped allowlists for env vars.
- Agent profiles for Codex, Claude Code, Cursor, and generic shell.
- Local audit events for which command accessed which preset variables.
- Redaction helpers for logs and copied command output.

#### Later

- Local secret health checks and rotation reminders.
- Encrypted import/export for lightweight sharing.
- Optional team/cloud sync only after the local-first workflow is proven.

### Development workflow

```bash
# install dependencies
bun install

# launch desktop app
bun run tauri dev

# run frontend build
bun run build

# run Rust tests
cargo test
```

---

<p align="center">
  Built for developers who switch projects, models, clouds, and clients all day.
</p>
