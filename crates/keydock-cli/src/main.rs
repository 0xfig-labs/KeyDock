use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand, ValueEnum};
use keydock_core::{current_active_preset, deactivate_active_preset, shell_hook, AppStore};
use std::process::Command;

#[derive(Parser)]
#[command(name = "keydock")]
#[command(about = "Activate KeyDock preset environments")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Print shell hook code. Used by .zshrc/.bashrc.
    Hook {
        #[arg(value_enum)]
        shell: Shell,
    },
    /// Open the KeyDock desktop app.
    Open,
    /// Manage environment presets.
    Preset {
        #[command(subcommand)]
        command: PresetCommands,
    },
    /// Run a command with a preset's env vars injected.
    Run {
        preset: String,
        #[arg(trailing_var_arg = true, required = true)]
        command: Vec<String>,
    },
    /// Preview what env vars a preset would inject without running the command.
    Plan {
        preset: String,
        #[arg(trailing_var_arg = true)]
        command: Vec<String>,
    },
}

#[derive(Subcommand)]
enum PresetCommands {
    /// List all presets.
    List,
    /// Show preset details.
    Show { preset: String },
    /// Create a new preset.
    Create { name: String },
    /// Delete a preset.
    Delete { preset: String },
    /// Include another preset.
    Include { preset: String, included: String },
    /// Remove an included preset.
    RemoveInclude { preset: String, included: String },
    /// Preview env vars that would be exported.
    Preview { preset: String },
    /// List available preset templates.
    Templates,
    /// Activate a preset for all new shells.
    Activate { preset: String },
    /// Show the currently active preset.
    Current,
    /// Deactivate the active preset.
    Deactivate,
}

#[derive(Clone, ValueEnum)]
enum Shell {
    Zsh,
    Bash,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Hook { shell } => {
            println!("{}", shell_hook(shell.as_str())?);
            Ok(())
        }
        Commands::Open => open_app(),
        Commands::Preset { command } => handle_preset(command),
        Commands::Run { preset, command } => run(&preset, &command),
        Commands::Plan { preset, command } => plan(&preset, &command),
    }
}

impl Shell {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Zsh => "zsh",
            Self::Bash => "bash",
        }
    }
}

fn open_store() -> Result<AppStore> {
    AppStore::open_default()
}

fn run(preset: &str, command: &[String]) -> Result<()> {
    if command.is_empty() {
        return Err(anyhow!("no command provided"));
    }
    let store = open_store()?;
    let env = store.resolve_preset_env(preset)?;
    eprintln!(
        "[keydock] running with preset \"{preset}\" ({count} env var{plural})",
        count = env.len(),
        plural = if env.len() == 1 { "" } else { "s" }
    );
    let mut cmd = Command::new(&command[0]);
    if command.len() > 1 {
        cmd.args(&command[1..]);
    }
    for e in &env {
        cmd.env(&e.env_name, &e.value);
    }
    let status = cmd.status()?;
    if !status.success() {
        std::process::exit(status.code().unwrap_or(1));
    }
    Ok(())
}

fn plan(preset: &str, command: &[String]) -> Result<()> {
    let store = open_store()?;
    let env = store.resolve_preset_env(preset)?;
    let cmd_str = if command.is_empty() {
        "(no command)"
    } else {
        &command.join(" ")
    };
    println!("Preset:  {preset}");
    println!("Command: {cmd_str}");
    if env.is_empty() {
        println!("Would inject: (none)");
        return Ok(());
    }
    println!("Would inject:");
    for item in &env {
        let source = store
            .get_secret_by_id(&item.secret_id)
            .ok()
            .flatten()
            .map(|s| s.name)
            .unwrap_or_else(|| item.secret_id.clone());
        println!("  {:<24} (from: {})", item.env_name, source);
    }
    println!();
    println!("No values are shown. Use 'keydock run' to execute with these vars.");
    Ok(())
}

fn open_app() -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .args(["-a", "KeyDock"])
            .status()
            .context("open KeyDock.app")?;
        if status.success() {
            return Ok(());
        }
    }
    Err(anyhow!("unable to open KeyDock app"))
}

// ---------------------------------------------------------------------------
// Preset sub-commands
// ---------------------------------------------------------------------------

fn handle_preset(cmd: PresetCommands) -> Result<()> {
    match cmd {
        PresetCommands::List => preset_list(),
        PresetCommands::Show { preset } => preset_show(&preset),
        PresetCommands::Create { name } => preset_create(&name),
        PresetCommands::Delete { preset } => preset_delete(&preset),
        PresetCommands::Include { preset, included } => preset_include(&preset, &included),
        PresetCommands::RemoveInclude { preset, included } => {
            preset_remove_include(&preset, &included)
        }
        PresetCommands::Preview { preset } => preset_preview(&preset),
        PresetCommands::Templates => preset_templates(),
        PresetCommands::Activate { preset } => preset_activate(&preset),
        PresetCommands::Current => preset_current(),
        PresetCommands::Deactivate => preset_deactivate(),
    }
}

fn preset_activate(preset: &str) -> Result<()> {
    let active = open_store()?.activate_preset(preset)?;
    println!(
        "Activated preset \"{}\" ({} env var{}):",
        active.name,
        active.env_count,
        if active.env_count == 1 { "" } else { "s" }
    );
    for name in &active.env_names {
        println!("  \u{2022} {name}");
    }
    println!("New shells will load these env vars via the KeyDock hook.");
    Ok(())
}

fn preset_deactivate() -> Result<()> {
    let active = current_active_preset()?;
    deactivate_active_preset()?;
    match active {
        Some(prev) => {
            println!(
                "Deactivated preset \"{}\" ({} env var{}):",
                prev.name,
                prev.env_count,
                if prev.env_count == 1 { "" } else { "s" }
            );
            for name in &prev.env_names {
                println!("  \u{2022} {name}");
            }
        }
        None => println!("No active KeyDock preset to deactivate"),
    }
    Ok(())
}

fn preset_current() -> Result<()> {
    match current_active_preset()? {
        Some(active) => {
            println!(
                "Active preset: \"{}\" ({} env var{}):",
                active.name,
                active.env_count,
                if active.env_count == 1 { "" } else { "s" }
            );
            for name in &active.env_names {
                println!("  \u{2022} {name}");
            }
        }
        None => println!("No active KeyDock preset"),
    }
    Ok(())
}

fn preset_list() -> Result<()> {
    let store = open_store()?;
    let presets = store.list_presets()?;
    if presets.is_empty() {
        println!("No presets found");
        return Ok(());
    }
    let mut first = true;
    for p in &presets {
        if first {
            first = false;
        } else {
            println!();
        }
        let entries = store.list_preset_entries(&p.name)?;
        println!(
            "{} ({} env var{}):",
            p.name,
            entries.len(),
            if entries.len() == 1 { "" } else { "s" }
        );
        if entries.is_empty() {
            println!("  (no env vars mapped)");
        } else {
            for e in &entries {
                println!("  \u{2022} {}", e.env_name);
            }
        }
    }
    Ok(())
}

fn preset_show(preset: &str) -> Result<()> {
    let store = open_store()?;
    let p = store
        .get_preset(preset)?
        .ok_or_else(|| anyhow!("preset \"{preset}\" not found"))?;
    let entries = store.list_preset_entries(&p.name)?;
    println!("Preset: {}", p.name);
    if let Some(desc) = &p.description {
        println!("Description: {desc}");
    }
    println!(
        "Env vars: {}",
        if entries.is_empty() {
            "none".into()
        } else {
            entries.len().to_string()
        }
    );
    for e in &entries {
        println!("  \u{2022} {}", e.env_name);
    }
    Ok(())
}

fn preset_create(name: &str) -> Result<()> {
    let store = open_store()?;
    let p = store.create_preset(keydock_core::PresetInput {
        name: name.into(),
        description: None,
    })?;
    println!("Created preset \"{}\"", p.name);
    Ok(())
}

fn preset_delete(preset: &str) -> Result<()> {
    let store = open_store()?;
    store.delete_preset(preset)?;
    println!("Deleted preset \"{preset}\"");
    Ok(())
}

fn preset_include(preset: &str, included: &str) -> Result<()> {
    let store = open_store()?;
    store.include_preset(preset, included)?;
    println!("Included \"{included}\" in preset \"{preset}\"");
    Ok(())
}

fn preset_remove_include(preset: &str, included: &str) -> Result<()> {
    let store = open_store()?;
    store.remove_include_preset(preset, included)?;
    println!("Removed \"{included}\" from preset \"{preset}\"");
    Ok(())
}

fn preset_preview(preset: &str) -> Result<()> {
    let store = open_store()?;
    let preview = store.preview_preset(preset)?;
    println!("Preset: {preset}");
    println!(
        "Would export {} env var{}:",
        preview.env_count,
        if preview.env_count == 1 { "" } else { "s" }
    );
    for name in &preview.env_names {
        println!("  \u{2022} {name}");
    }
    println!("Secret values: hidden");
    if preview.conflicts.is_empty() {
        println!("Conflicts: none");
    } else {
        println!("Conflicts:");
        for c in &preview.conflicts {
            println!("  \u{2022} {c}");
        }
    }
    Ok(())
}

fn preset_templates() -> Result<()> {
    println!("Available preset templates:");
    let templates = keydock_core::list_preset_templates();
    for t in &templates {
        println!("  {:20} {}", t.name.to_lowercase(), t.description);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plan_accepts_optional_command_after_separator() {
        let cli = Cli::try_parse_from(["keydock", "plan", "fullstack", "--", "bun", "run", "dev"])
            .unwrap();
        match cli.command {
            Commands::Plan { preset, command } => {
                assert_eq!(preset, "fullstack");
                assert_eq!(command, ["bun", "run", "dev"]);
            }
            _ => panic!("expected plan command"),
        }
    }

    #[test]
    fn plan_accepts_no_command() {
        let cli = Cli::try_parse_from(["keydock", "plan", "fullstack"]).unwrap();
        assert!(matches!(
            cli.command,
            Commands::Plan { command, .. } if command.is_empty()
        ));
    }
}
