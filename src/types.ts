// --- SecretField types (1Password-style custom fields) ---

export type SecretFieldType =
  | "secret"
  | "text"
  | "url"
  | "email"
  | "number"
  | "json"
  | "env"
  | "note"
  | "file"

export type SecretFieldPurpose =
  | "credential"
  | "identifier"
  | "endpoint"
  | "metadata"
  | "note"

export interface SecretField {
  id: string
  secretId: string
  label: string
  fieldType: SecretFieldType
  encryptedValue?: string | null
  valuePreview?: string | null
  sensitive: boolean
  envName?: string | null
  purpose?: SecretFieldPurpose | null
  section?: string | null
  sortOrder: number
  enabled: boolean
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface SecretFieldInput {
  label: string
  fieldType: SecretFieldType
  value?: string | null
  sensitive: boolean
  envName?: string | null
  purpose?: SecretFieldPurpose | null
  section?: string | null
  sortOrder?: number | null
  enabled: boolean
  expiresAt?: string | null
}

// Domain types — mirror crates/keydock-core/src/models.rs (serde camelCase).
// Keep these aligned with the Rust structs; extra Rust fields are ignored at runtime.

// --- Secrets ---

export type SecretCategory =
  | "aI"
  | "cloud"
  | "search"
  | "database"
  | "devTool"
  | "payment"
  | "custom"

export const SECRET_CATEGORIES: SecretCategory[] = [
  "aI",
  "cloud",
  "search",
  "database",
  "devTool",
  "payment",
  "custom",
]

export interface Secret {
  id: string
  name: string
  category: SecretCategory
  tags: string[]
  notes?: string | null
}

export interface SecretInput {
  name: string
  category: SecretCategory
  tags: string[]
  notes: string | null
}

// --- Presets ---

export interface PresetEntry {
  id: string
  presetId: string
  secretId: string
  secretName?: string | null
  fieldId: string
  fieldLabel?: string | null
  envName: string
  preview?: string | null
  sortOrder: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ShellIntegrationStatus {
  shell: string
  installed: boolean
  rcPath: string
}

// --- Audit ---

export interface AuditLog {
  id: string
  action: string
  targetId?: string | null
  targetName?: string | null
  presetId?: string | null
  presetName?: string | null
  envName?: string | null
  createdAt: string
}

export interface VaultStatus {
  initialized: boolean
}

// --- Forms (frontend-only state) ---

export interface SecretForm {
  name: string
  category: SecretCategory
  tags: string
}

export interface SecretFieldDraft {
  id: string
  label: string
  fieldType: SecretFieldType
  value: string
  sensitive: boolean
  envName: string
  templateEnvName?: string | null
  purpose?: SecretFieldPurpose | null
  section?: string | null
  placeholder?: string
  required?: boolean
  custom?: boolean
}

// --- Presets ---

export interface Preset {
  id: string
  name: string
  description?: string | null
  tags: string[]
}

export interface PresetInclude {
  id: string
  presetId: string
  includedPresetId: string
  includedPresetName?: string | null
  sortOrder: number
  createdAt: string
}

export interface PresetTemplate {
  name: string
  description: string
  fields: PresetTemplateField[]
}

export interface PresetTemplateField {
  envName: string
  sensitive: boolean
  required: boolean
  description: string
}

export interface ActivePreset {
  id: string
  name: string
  sourceType: string
  envCount: number
  envNames: string[]
}
