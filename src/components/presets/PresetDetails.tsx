import { useCallback, useEffect, useState } from "react"
import {
  FolderOpenIcon,
  PlusIcon,
  Trash2Icon,
  ZapIcon,
  PowerOffIcon,
  SearchIcon,
  XIcon,
  LayersIcon,
  CheckIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/useToast"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { usePresetDetails } from "@/hooks/usePresetDetails"
import { useSecrets } from "@/hooks/useSecrets"
import { useSecretFields } from "@/hooks/useSecretFields"
import {
  deletePreset as deletePresetApi,
  openKeydockFolder,
} from "@/lib/tauri"
import type { Preset } from "@/types"
import { RunCommandCard } from "./RunCommandCard"

interface PresetDetailsProps {
  preset: Preset
  onDeletePreset?: (id: string) => void
}

export function PresetDetails({
  preset,
  onDeletePreset,
}: PresetDetailsProps) {
  const { t } = useTranslation()
  const { show } = useToast()
  const confirm_ = useConfirm()
  const details = usePresetDetails()

  // Add-entry panel
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null)

  // Inline envName override when adding a field
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [customEnvName, setCustomEnvName] = useState("")

  // Inline envName edit for existing entries
  const [editingEntryEnvName, setEditingEntryEnvName] = useState<string | null>(null)
  const [editingEntryNewEnvName, setEditingEntryNewEnvName] = useState("")

  const [previewResult, setPreviewResult] = useState<string[]>([])

  // Hooks for the add-entry panel (independent instances)
  const {
    filtered: filteredSecrets,
    search: secretSearch,
    setSearch: setSecretSearch,
    loading: secretsLoading,
    refresh: refreshSecrets,
  } = useSecrets()
  const fieldService = useSecretFields()

  // Load entries when preset changes
  useEffect(() => {
    if (preset?.id) {
      details.refresh(preset.id)
    }
  }, [preset?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (preset?.id && details.entries.length > 0) {
      details.preview(preset.id).then(setPreviewResult).catch(() => setPreviewResult([]))
    } else {
      setPreviewResult([])
    }
  }, [preset?.id, details.entries.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const isActive = details.activePreset?.id === preset.id

  // --- Handlers ---

  const handleActivate = useCallback(async () => {
    if (isActive) {
      await details.deactivate()
    } else {
      await details.activate(preset.id)
    }
  }, [details, isActive, preset.id])

  const handleAddEntry = useCallback(
    async (fieldId: string, envName?: string | null) => {
      const entry = await details.addEntry(preset.id, fieldId, envName)
      if (entry) {
        setShowAddPanel(false)
        setSelectedSecretId(null)
      }
    },
    [details, preset.id],
  )

  // Inline envName override — start editing a field's envName before adding
  const handleStartFieldEdit = useCallback((fieldId: string, defaultEnvName: string) => {
    setEditingFieldId(fieldId)
    setCustomEnvName(defaultEnvName)
  }, [])

  const handleConfirmAddEntry = useCallback(
    async (fieldId: string) => {
      const envName = customEnvName.trim()
      if (!envName) return
      await handleAddEntry(fieldId, envName)
      setEditingFieldId(null)
      setCustomEnvName("")
    },
    [customEnvName, handleAddEntry],
  )

  const handleCancelFieldEdit = useCallback(() => {
    setEditingFieldId(null)
    setCustomEnvName("")
  }, [])

  // Inline envName edit for existing entries
  const handleStartEntryEdit = useCallback(
    (entry: { envName: string }) => {
      setEditingEntryEnvName(entry.envName)
      setEditingEntryNewEnvName(entry.envName)
    },
    [],
  )

  const handleConfirmEntryEdit = useCallback(async () => {
    const newName = editingEntryNewEnvName.trim().toUpperCase()
    if (!newName || newName === editingEntryEnvName) {
      setEditingEntryEnvName(null)
      return
    }
    const result = await details.updateEntryEnvName(preset.id, editingEntryEnvName!, newName)
    if (result) {
      setEditingEntryEnvName(null)
    }
  }, [editingEntryNewEnvName, editingEntryEnvName, details, preset.id])

  const handleCancelEntryEdit = useCallback(() => {
    setEditingEntryEnvName(null)
  }, [])

  const handleRemoveEntry = useCallback(
    async (envName: string) => {
      await details.removeEntry(preset.id, envName)
    },
    [details, preset.id],
  )

  const handleDelete = useCallback(async () => {
    const message = isActive
      ? t("presetDetails.deleteConfirmActiveMsg", { name: preset.name })
      : t("presetDetails.deleteConfirmMsg", { name: preset.name })
    const ok = await confirm_({
      title: t("presetDetails.deleteConfirmTitle"),
      message,
      confirmLabel: t("presetDetails.delete"),
      variant: "danger",
    })
    if (!ok) return
    try {
      await deletePresetApi(preset.id)
      show(t("presetDetails.deletedMsg", { name: preset.name }), "info")
      onDeletePreset?.(preset.id)
    } catch (e) {
      show(e instanceof Error ? e.message : String(e), "error")
    }
  }, [confirm_, isActive, preset.id, preset.name, show, t, onDeletePreset])

  const handleOpenAddPanel = useCallback(() => {
    setShowAddPanel(true)
    setSelectedSecretId(null)
    setSecretSearch("")
    refreshSecrets()
  }, [setSecretSearch, refreshSecrets])

  const handleCloseAddPanel = useCallback(() => {
    setShowAddPanel(false)
    setSelectedSecretId(null)
  }, [])

  const handleSecretSelect = useCallback(
    async (secretId: string) => {
      if (selectedSecretId === secretId) {
        setSelectedSecretId(null)
        return
      }
      setSelectedSecretId(secretId)
      await fieldService.refresh(secretId)
    },
    [selectedSecretId, fieldService],
  )

  async function handleOpenFolder() {
    await openKeydockFolder()
  }

  const shellCmd = `keydock run ${preset.name} -- bun run dev`

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-border flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground font-mono break-all min-w-0">
              {preset.name}
            </h1>
            {isActive && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
              >
                <ZapIcon className="size-2.5 mr-0.5" />
                {t("presets.active")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {preset.description || t("presets.noDescription")}
          </p>
          {details.entries.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {t("presetDetails.varsCount", { count: details.entries.length })}
            </p>
          )}
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivate}
              disabled={details.activating}
              className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              {details.activating ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              ) : (
                <PowerOffIcon className="size-3.5" />
              )}
              {t("presetDetails.deactivate")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleActivate}
              disabled={details.activating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {details.activating ? (
                <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ZapIcon className="size-3.5" />
              )}
              {details.activePreset
                ? t("presetDetails.reactivate")
                : t("presetDetails.activate")}
            </Button>
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleDelete}
            className="border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
            title={t("presetDetails.deletePreset")}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Environment Mapping ── */}
      <div className="space-y-3">
        {/* Section bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayersIcon className="size-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("presetDetails.envMapping")}
            </h3>
            {details.entries.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {t("presetDetails.varsCount", {
                  count: details.entries.length,
                })}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={showAddPanel ? handleCloseAddPanel : handleOpenAddPanel}
            >
              <PlusIcon className="size-3 mr-1" />
              {t("presetDetails.importDefaults")}
            </Button>
          </div>
        </div>

        {/* ── Preview result ── */}
        {previewResult.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {t("presetDetails.generatedBy")}
              </p>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleOpenFolder}
                className="text-muted-foreground/50 hover:text-foreground"
                title={t("secretsFieldRow.openFolder")}
              >
                <FolderOpenIcon className="size-3" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {previewResult.map((envVar) => (
                <code
                  key={envVar}
                  className="block text-[11px] font-mono text-emerald-600 dark:text-emerald-400"
                >
                  {envVar}
                </code>
              ))}
            </div>
          </div>
        )}

        {/* ── Add Entry inline panel ── */}
        {showAddPanel && (
          <div className="bg-card border border-border rounded-lg p-3 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={secretSearch}
                  onChange={(e) => setSecretSearch(e.target.value)}
                  placeholder={t("secrets.searchPlaceholder")}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCloseAddPanel}
                className="text-muted-foreground"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto overflow-x-hidden space-y-0.5">
              {secretsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : filteredSecrets.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  {secretSearch
                    ? t("secrets.noSecretsFound")
                    : t("presetDetails.selectServiceTip")}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredSecrets.map((secret) => {
                    const isSelected = selectedSecretId === secret.id
                    return (
                      <div key={secret.id}>
                        {/* Secret row — click to expand fields */}
                        <button
                          type="button"
                          onClick={() => handleSecretSelect(secret.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between gap-2 ${
                            isSelected
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="font-medium truncate">
                            {secret.name}
                          </span>
                          <svg
                            className={`size-3 text-muted-foreground shrink-0 transition-transform ${
                              isSelected ? "rotate-90" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </button>

                        {/* Fields for the selected secret */}
                        {isSelected && (
                          <div className="ml-3 pl-2.5 border-l border-border space-y-0.5 mt-0.5">
                            {fieldService.loading ? (
                              <div className="flex items-center justify-center py-3">
                                <span className="size-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                              </div>
                            ) : (
                              fieldService.fields
                                .filter((f) => f.envName && f.enabled)
                                .map((field) => (
                                  <div
                                    key={field.id}
                                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                                        {field.envName}
                                      </code>
                                      <span className="text-muted-foreground/40">
                                        ·
                                      </span>
                                      <span className="text-foreground truncate">
                                        {field.label}
                                      </span>
                                    </div>
                                    {editingFieldId === field.id ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          value={customEnvName}
                                          onChange={(e) =>
                                            setCustomEnvName(
                                              e.target.value.toUpperCase(),
                                            )
                                          }
                                          className="w-36 h-7 text-[11px] font-mono"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter")
                                              handleConfirmAddEntry(field.id)
                                            if (e.key === "Escape")
                                              handleCancelFieldEdit()
                                          }}
                                        />
                                        <Button
                                          size="icon-xs"
                                          onClick={() =>
                                            handleConfirmAddEntry(field.id)
                                          }
                                          className="text-emerald-600 dark:text-emerald-400"
                                        >
                                          <CheckIcon className="size-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon-xs"
                                          onClick={handleCancelFieldEdit}
                                          className="text-muted-foreground"
                                        >
                                          <XIcon className="size-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={() =>
                                          handleStartFieldEdit(
                                            field.id,
                                            field.envName!,
                                          )
                                        }
                                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:bg-emerald-500/10 shrink-0"
                                        title={t(
                                          "presetDetails.importDefaults",
                                        )}
                                      >
                                        <PlusIcon className="size-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                            )}
                            {!fieldService.loading &&
                              fieldService.fields.filter(
                                (f) => f.envName && f.enabled,
                              ).length === 0 && (
                                <p className="px-2.5 py-2 text-[10px] text-muted-foreground italic">
                                  {t("secretForm.noEnv")}
                                </p>
                              )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Entry list ── */}
        {details.loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : details.entries.length === 0 && !showAddPanel ? (
          /* Empty state */
          <div className="text-center py-10 space-y-3">
            <LayersIcon className="size-8 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("variableList.noVariables")}
              </p>
            </div>
            <Button variant="outline" size="xs" onClick={handleOpenAddPanel}>
              <PlusIcon className="size-3 mr-1" />
              {t("presetDetails.importDefaults")}
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {details.entries
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-muted-foreground/20 transition-colors group"
                >
                  {/* Entry content */}
                  <div className="flex items-center gap-2 min-w-0">
                    {editingEntryEnvName === entry.envName ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingEntryNewEnvName}
                          onChange={(e) =>
                            setEditingEntryNewEnvName(
                              e.target.value.toUpperCase(),
                            )
                          }
                          className="w-36 h-6 text-[11px] font-mono"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmEntryEdit()
                            if (e.key === "Escape") handleCancelEntryEdit()
                          }}
                          onBlur={handleCancelEntryEdit}
                        />
                        <Button
                          size="icon-xs"
                          onClick={handleConfirmEntryEdit}
                          className="text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckIcon className="size-2.5" />
                        </Button>
                      </div>
                    ) : (
                      <code
                        className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => handleStartEntryEdit(entry)}
                        title={t("presetDetails.editEnvName")}
                      >
                        {entry.envName}
                      </code>
                    )}
                    <span className="text-muted-foreground/40 select-none">
                      ·
                    </span>
                    <span className="text-xs text-foreground truncate">
                      <span className="font-medium">{entry.secretName ?? "?"}</span>
                      {entry.fieldLabel && (
                        <>
                          {" "}
                          <span className="text-muted-foreground/40">/</span>{" "}
                          <span className="text-muted-foreground">
                            {entry.fieldLabel}
                          </span>
                        </>
                      )}
                    </span>
                    {entry.preview && (
                      <code className="text-[10px] font-mono text-muted-foreground/50 hidden sm:inline-block">
                        {entry.preview.length > 20
                          ? entry.preview.slice(0, 20) + "…"
                          : entry.preview}
                      </code>
                    )}
                  </div>

                  {/* Remove */}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleRemoveEntry(entry.envName)}
                    className="text-muted-foreground/40 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title={t("variableList.unbind")}
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Run Command Card (kept at bottom) ── */}
      <RunCommandCard command={shellCmd} onCopy={() => {}} />
    </div>
  )
}
