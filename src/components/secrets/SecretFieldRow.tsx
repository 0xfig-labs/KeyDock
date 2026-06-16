import { memo, useState, useEffect } from "react"
import {
  CheckIcon,
  CodeIcon,
  CopyIcon,
  EyeIcon,
  ExternalLinkIcon,
  LayersIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useClipboard } from "@/hooks/useClipboard"
import { useToast } from "@/hooks/useToast"
import { openExternal, listPresets, addPresetEntry } from "@/lib/tauri"
import type { SecretField, Preset } from "@/types"
import { useTranslation } from "react-i18next"

interface SecretFieldRowProps {
  field: SecretField
  revealed: string | undefined
  onReveal: (fieldId: string) => Promise<string | undefined>
  onEdit?: (field: SecretField) => void
  onDelete?: (field: SecretField) => void
}

function SecretFieldRowImpl({
  field,
  revealed,
  onReveal,
  onEdit,
  onDelete,
}: SecretFieldRowProps) {
  const { copiedText, copy } = useClipboard()
  const { show: showToast } = useToast()
  const { t } = useTranslation()
  const [presetPanelOpen, setPresetPanelOpen] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const hasEnv = !!field.envName
  const isSensitive = field.sensitive && field.fieldType !== "url"
  const isUrl = field.fieldType === "url"
  const isExpired = field.expiresAt ? new Date(field.expiresAt) < new Date() : false
  const displayValue = revealed ?? field.valuePreview ?? (isSensitive ? "••••" : "")
  const [envNameCopied, setEnvNameCopied] = useState(false)
  const isSimple = !hasEnv && !isSensitive

  useEffect(() => {
    if (!presetPanelOpen) return
    setPresetsLoading(true)
    listPresets()
      .then(setPresets)
      .catch(() => setPresets([]))
      .finally(() => setPresetsLoading(false))
  }, [presetPanelOpen])

  async function handleCopy() {
    let value = revealed
    if (!value && isSensitive) {
      value = await onReveal(field.id)
    } else if (!value) {
      value = field.valuePreview ?? ""
    }
    if (value) {
      await copy({ text: value, label: `Field: ${field.label}`, targetId: field.id })
    }
  }

  async function handleCopyAsEnv() {
    let value = revealed
    if (!value && isSensitive) {
      value = await onReveal(field.id)
    } else if (!value) {
      value = field.valuePreview ?? ""
    }
    if (value && field.envName) {
      await copy({ text: `${field.envName}=${value}`, label: "ENV line", targetId: field.id, envName: field.envName })
    }
  }

  async function handleCopyAsExport() {
    let value = revealed
    if (!value && isSensitive) {
      value = await onReveal(field.id)
    } else if (!value) {
      value = field.valuePreview ?? ""
    }
    if (value && field.envName) {
      await copy({ text: `export ${field.envName}=${value}`, label: "Export line", targetId: field.id, envName: field.envName })
    }
  }

  function handleAddToPreset() {
    setPresetPanelOpen(!presetPanelOpen)
  }

  async function handleSelectPreset(preset: Preset) {
    try {
      await addPresetEntry(preset.id, field.id, field.envName ?? null)
      showToast(t("secretsFieldRow.addedToPreset", { presetName: preset.name }), "success")
    } catch {
      showToast(t("secretsFieldRow.addToPresetError"), "error")
    }
    setPresetPanelOpen(false)
  }

  function handleOpenUrl() {
    if (field.valuePreview) {
      void openExternal(field.valuePreview)
    }
  }

  async function handleCopyEnvName() {
    if (!field.envName) return
    await copy({ text: field.envName, label: `ENV name: ${field.envName}`, envName: field.envName, silent: true })
    setEnvNameCopied(true)
    setTimeout(() => setEnvNameCopied(false), 2000)
  }

  const fieldTypeBadge = (
    <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono uppercase border-border text-muted-foreground shrink-0">
      {field.fieldType}
    </Badge>
  )

  // ── Simple metadata field (no env, not sensitive) ──────────────────
  if (isSimple) {
    return (
      <div className="border-b border-border/55 py-3 text-xs transition-colors hover:border-border/80">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-foreground truncate text-xs">{field.label}</span>
              {fieldTypeBadge}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline" size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground"
                title="Copy value"
              >
                {copiedText ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(field)}
                  className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground" title="Edit field">
                  <PencilIcon className="size-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" onClick={() => onDelete(field)}
                  className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-rose-600" title="Delete field">
                  <Trash2Icon className="size-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {isUrl ? (
              <code className="font-mono text-[10px] text-muted-foreground break-all cursor-pointer underline decoration-dotted underline-offset-2 hover:decoration-solid hover:text-foreground transition-colors flex items-center gap-1"
                onClick={handleOpenUrl}>
                <ExternalLinkIcon className="size-3 shrink-0" />
                {displayValue}
              </code>
            ) : (
              <code className="font-mono text-[10px] text-muted-foreground break-all select-all cursor-pointer hover:text-foreground transition-colors"
                onClick={handleCopy}>
                {displayValue}
              </code>
            )}
          </div>
      </div>
    )
  }

  // ── ENV field or sensitive field (full treatment) ──────────────────
  return (
    <div className="border-b border-border/55 py-3 space-y-2 text-xs transition-colors hover:border-border/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-foreground truncate text-xs">{field.label}</span>
            {fieldTypeBadge}
            {hasEnv && (
              <Badge
                variant="outline"
                className="text-[9px] font-mono py-0 px-1.5 border-border/60 text-muted-foreground cursor-pointer hover:text-foreground hover:border-foreground/30 transition-colors truncate max-w-[160px] shrink-0"
                onClick={handleCopyEnvName}
                title={`Copy ENV name: ${field.envName}`}
              >
                {envNameCopied ? <CheckIcon className="size-2.5 text-emerald-600 dark:text-emerald-400 mr-0.5" /> : null}
                {field.envName}
              </Badge>
            )}
          </div>
        </div>

        {field.expiresAt && (
          <div className={`text-[9px] font-mono ${isExpired ? "text-rose-500 dark:text-rose-400" : "text-amber-500 dark:text-amber-400"}`}>
            {isExpired ? "Expired" : "Expires"}: {field.expiresAt}
          </div>
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {revealed && copiedText === revealed ? (
            <CheckIcon className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <CodeIcon className="size-3.5 text-muted-foreground/70 shrink-0" />
          )}
          {isUrl ? (
            <code className="font-mono text-[10px] text-muted-foreground break-all flex items-center gap-1 min-w-0 cursor-pointer underline decoration-dotted underline-offset-2 hover:decoration-solid hover:text-foreground transition-colors"
              onClick={handleOpenUrl}>
              <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
              {displayValue}
            </code>
          ) : (
            <code className="font-mono text-[10px] text-muted-foreground break-all select-all cursor-pointer hover:text-foreground transition-colors min-w-0"
              onClick={handleCopy}>
              {displayValue}
            </code>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {isSensitive && (
              <Button variant="outline" size="sm" onClick={() => onReveal(field.id)}
                className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground"
                title={revealed ? "Hide" : "Reveal"}>
                <EyeIcon className="size-3" />
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={handleCopy}
              className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground" title="Copy value">
              {copiedText && revealed && copiedText === revealed ? (
                <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <CopyIcon className="size-3" />
              )}
            </Button>

            {hasEnv && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyAsEnv}
                  className="h-6 w-6 p-0 border-border text-sky-500 hover:text-sky-400 hover:border-sky-500/40"
                  title="Copy as ENV line">
                  <CodeIcon className="size-3" />
                </Button>

                <Button variant="outline" size="sm" onClick={handleAddToPreset}
                  className={`h-6 w-6 p-0 border-border text-violet-500 hover:text-violet-400 hover:border-violet-500/40 ${presetPanelOpen ? "bg-violet-500/10 border-violet-500/40" : ""}`}
                  title="Add to Preset">
                  <LayersIcon className="size-3" />
                </Button>

                <Button variant="outline" size="sm" onClick={handleCopyAsExport}
                  className="h-6 w-6 p-0 border-border text-sky-500 hover:text-sky-400 hover:border-sky-500/40"
                  title="Copy as export">
                  <span className="text-[8px] font-bold font-mono leading-none">EX</span>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(field)}
                className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-foreground" title="Edit field">
                <PencilIcon className="size-3" />
              </Button>
            )}

            {onDelete && (
              <Button variant="outline" size="sm" onClick={() => onDelete(field)}
                className="h-6 w-6 p-0 border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20" title="Delete field">
                <Trash2Icon className="size-3" />
              </Button>
            )}
          </div>
        </div>

        {hasEnv && presetPanelOpen && (
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 py-1 px-1">
            {presetsLoading ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("secretsFieldRow.loading")}
              </div>
            ) : presets.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("secretsFieldRow.noPresets")}
              </div>
            ) : (
              presets.map((p) => (
                <button key={p.id}
                  className="w-full text-left px-3 py-1.5 text-xs text-popover-foreground hover:bg-violet-500/10 rounded-md transition-colors flex items-center gap-2"
                  onClick={() => handleSelectPreset(p)}>
                  <LayersIcon className="size-3 text-violet-500" />
                  {p.name}
                </button>
              ))
            )}
          </div>
        )}
    </div>
  )
}

export const SecretFieldRow = memo(SecretFieldRowImpl)
