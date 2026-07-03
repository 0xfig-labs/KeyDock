import type { PresetTemplate, SecretCategory, SecretFieldDraft, SecretFieldPurpose, SecretFieldType } from "@/types"

// --- Secret form initial state ---

export const emptySecretForm = {
  name: "",
  category: "aI" as SecretCategory,
  tags: "",
}

// --- Default field templates per category ---
// The create flow starts from a 1Password-like template: common metadata
// fields are editable immediately, while encrypted/env-capable fields are
// modeled separately so users do not have to create every field manually.

export interface DefaultFieldTemplate {
  label: string
  fieldType: SecretFieldType
  sensitive: boolean
  envName?: string
  purpose?: SecretFieldPurpose
  section: "common" | "environment"
  placeholder?: string
  required?: boolean
}

export const defaultFieldTemplates: Record<SecretCategory, DefaultFieldTemplate[]> = {
  aI: [
    { label: "Provider", fieldType: "text", sensitive: false, section: "common", placeholder: "OpenAI / Anthropic / OpenRouter" },
    { label: "Base URL", fieldType: "url", sensitive: false, section: "common", placeholder: "https://api.openai.com/v1" },
    { label: "Default Model", fieldType: "text", sensitive: false, section: "common", placeholder: "gpt-4.1 / claude-sonnet-4" },
    { label: "Organization ID", fieldType: "text", sensitive: false, section: "common", placeholder: "org_..." },
    { label: "Dashboard URL", fieldType: "url", sensitive: false, section: "common", placeholder: "https://platform.openai.com" },
    { label: "Docs URL", fieldType: "url", sensitive: false, section: "common", placeholder: "https://docs..." },
    { label: "API Key", fieldType: "secret", sensitive: true, envName: "{SERVICE}_API_KEY", purpose: "credential", section: "environment", placeholder: "sk-...", required: true },
    { label: "API Base URL Env", fieldType: "url", sensitive: false, envName: "{SERVICE}_BASE_URL", purpose: "endpoint", section: "environment", placeholder: "Optional env override" },
  ],
  cloud: [
    { label: "Dashboard URL", fieldType: "url", sensitive: false, section: "common", placeholder: "Cloud console URL" },
    { label: "Account ID", fieldType: "text", sensitive: false, section: "common", placeholder: "Account / tenant / org ID" },
    { label: "API Token", fieldType: "secret", sensitive: true, envName: "{SERVICE}_API_TOKEN", purpose: "credential", section: "environment", placeholder: "Token", required: true },
    { label: "Account ID Env", fieldType: "text", sensitive: false, envName: "{SERVICE}_ACCOUNT_ID", purpose: "identifier", section: "environment", placeholder: "Optional env mapping" },
  ],
  search: [
    { label: "Dashboard URL", fieldType: "url", sensitive: false, section: "common", placeholder: "Search provider dashboard" },
    { label: "Docs URL", fieldType: "url", sensitive: false, section: "common", placeholder: "API docs" },
    { label: "API Key", fieldType: "secret", sensitive: true, envName: "{SERVICE}_API_KEY", purpose: "credential", section: "environment", placeholder: "API key", required: true },
  ],
  database: [
    { label: "Host", fieldType: "text", sensitive: false, section: "common", placeholder: "db.example.com" },
    { label: "Database", fieldType: "text", sensitive: false, section: "common", placeholder: "database name" },
    { label: "Connection URL", fieldType: "url", sensitive: true, envName: "{SERVICE}_URL", purpose: "endpoint", section: "environment", placeholder: "postgres://...", required: true },
    { label: "Password", fieldType: "secret", sensitive: true, envName: "{SERVICE}_PASSWORD", purpose: "credential", section: "environment", placeholder: "Password" },
  ],
  devTool: [
    { label: "Dashboard URL", fieldType: "url", sensitive: false, section: "common", placeholder: "Service dashboard" },
    { label: "Docs URL", fieldType: "url", sensitive: false, section: "common", placeholder: "API docs" },
    { label: "Token", fieldType: "secret", sensitive: true, envName: "{SERVICE}_TOKEN", purpose: "credential", section: "environment", placeholder: "Token", required: true },
    { label: "Base URL", fieldType: "url", sensitive: false, envName: "{SERVICE}_BASE_URL", purpose: "endpoint", section: "environment", placeholder: "Optional API base URL" },
  ],
  payment: [
    { label: "Dashboard URL", fieldType: "url", sensitive: false, section: "common", placeholder: "Payment dashboard" },
    { label: "Docs URL", fieldType: "url", sensitive: false, section: "common", placeholder: "API docs" },
    { label: "Secret Key", fieldType: "secret", sensitive: true, envName: "{SERVICE}_SECRET_KEY", purpose: "credential", section: "environment", placeholder: "sk_live_...", required: true },
    { label: "Publishable Key", fieldType: "text", sensitive: false, envName: "{SERVICE}_PUBLISHABLE_KEY", purpose: "identifier", section: "environment", placeholder: "pk_live_..." },
    { label: "Webhook Secret", fieldType: "secret", sensitive: true, envName: "{SERVICE}_WEBHOOK_SECRET", purpose: "credential", section: "environment", placeholder: "whsec_..." },
  ],
  custom: [
    { label: "Website", fieldType: "url", sensitive: false, section: "common", placeholder: "https://..." },
    { label: "Username", fieldType: "text", sensitive: false, section: "common", placeholder: "Account name / email" },
    { label: "Secret", fieldType: "secret", sensitive: true, envName: "{SERVICE}_SECRET", purpose: "credential", section: "environment", placeholder: "Token / password" },
  ],
}

/**
 * Convert a name to SCREAMING_SNAKE_CASE for env var naming.
 * e.g. "Anthropic" → "ANTHROPIC", "GitHub" → "GITHUB", "My OpenAI" → "MY_OPENAI"
 */
export function nameToScreamingSnakeCase(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

/**
 * Derive an env name from a service name and a template env name pattern.
 * Resolves the `{SERVICE}` placeholder to the screaming-snake-case of
 * the service name.
 *
 * e.g. serviceName="Anthropic", templateEnvName="{SERVICE}_API_KEY"   → "ANTHROPIC_API_KEY"
 *      serviceName="My Tool",   templateEnvName="{SERVICE}_TOKEN"     → "MY_TOOL_TOKEN"
 *      serviceName="",          templateEnvName="{SERVICE}_API_KEY"   → ""
 */
export function deriveEnvNameFromTemplate(serviceName: string | undefined, templateEnvName: string): string {
  if (!serviceName || !templateEnvName) return ""
  const prefix = nameToScreamingSnakeCase(serviceName)
  if (!prefix) return ""
  return templateEnvName.replace("{SERVICE}", prefix)
}

export function createSecretFieldDrafts(category: SecretCategory, serviceName?: string): SecretFieldDraft[] {
  return defaultFieldTemplates[category].map((template, index) => {
    const rawEnvName = template.envName ?? ""
    return {
      id: `${category}-${index}-${template.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: template.label,
      fieldType: template.fieldType,
      value: "",
      sensitive: template.sensitive,
      envName: deriveEnvNameFromTemplate(serviceName, rawEnvName),
      templateEnvName: rawEnvName || null,
      purpose: template.purpose ?? (template.section === "common" ? "metadata" : null),
      section: template.section,
      placeholder: template.placeholder,
      required: template.required ?? false,
      custom: false,
    }
  })
}

export function createCustomFieldDraft(index: number): SecretFieldDraft {
  return {
    id: `custom-${Date.now()}-${index}`,
    label: "",
    fieldType: "text",
    value: "",
    sensitive: false,
    envName: "",
    purpose: "metadata",
    section: "common",
    placeholder: "Custom value",
    custom: true,
  }
}

// --- Preset templates (v0.6) ---

export const presetTemplates: PresetTemplate[] = [
  {
    name: "OpenAI",
    description: "OpenAI API configuration",
    fields: [
      { envName: "OPENAI_API_KEY", sensitive: true, required: true, description: "OpenAI API key" },
      { envName: "OPENAI_BASE_URL", sensitive: false, required: false, description: "Custom API base URL" },
      { envName: "OPENAI_MODEL", sensitive: false, required: false, description: "Default model" },
    ],
  },
  {
    name: "Anthropic",
    description: "Anthropic API configuration",
    fields: [
      { envName: "ANTHROPIC_API_KEY", sensitive: true, required: true, description: "Anthropic API key" },
      { envName: "ANTHROPIC_BASE_URL", sensitive: false, required: false, description: "Custom API base URL" },
    ],
  },
  {
    name: "OpenRouter",
    description: "OpenRouter API configuration",
    fields: [
      { envName: "OPENROUTER_API_KEY", sensitive: true, required: true, description: "OpenRouter API key" },
      { envName: "OPENROUTER_BASE_URL", sensitive: false, required: false, description: "Custom API base URL" },
    ],
  },
  {
    name: "GitHub",
    description: "GitHub personal access token",
    fields: [
      { envName: "GITHUB_TOKEN", sensitive: true, required: true, description: "GitHub personal access token" },
      { envName: "GITHUB_USERNAME", sensitive: false, required: false, description: "GitHub username" },
    ],
  },
  {
    name: "Cloudflare",
    description: "Cloudflare API token and account ID",
    fields: [
      { envName: "CLOUDFLARE_API_TOKEN", sensitive: true, required: true, description: "Cloudflare API token" },
      { envName: "CLOUDFLARE_ACCOUNT_ID", sensitive: false, required: true, description: "Cloudflare account ID" },
    ],
  },
  {
    name: "Vercel",
    description: "Vercel access token",
    fields: [
      { envName: "VERCEL_TOKEN", sensitive: true, required: true, description: "Vercel access token" },
      { envName: "VERCEL_ORG_ID", sensitive: false, required: false, description: "Vercel team/org ID" },
    ],
  },
  {
    name: "Supabase",
    description: "Supabase project credentials",
    fields: [
      { envName: "SUPABASE_URL", sensitive: false, required: true, description: "Supabase project URL" },
      { envName: "SUPABASE_ANON_KEY", sensitive: true, required: true, description: "Supabase anonymous key" },
      { envName: "SUPABASE_SERVICE_KEY", sensitive: true, required: false, description: "Supabase service role key" },
    ],
  },
  {
    name: "Stripe",
    description: "Stripe API keys",
    fields: [
      { envName: "STRIPE_SECRET_KEY", sensitive: true, required: true, description: "Stripe secret key" },
      { envName: "STRIPE_PUBLISHABLE_KEY", sensitive: false, required: false, description: "Stripe publishable key" },
      { envName: "STRIPE_WEBHOOK_SECRET", sensitive: true, required: false, description: "Stripe webhook signing secret" },
    ],
  },
]

// --- Utility: split "a, b, c" into ["a", "b", "c"] ---

export function splitTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

// --- Utility: kebab-case for preset names ---

export function normalizePresetName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, "")
}
