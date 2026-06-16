import { type FormEvent, useCallback, useState, useRef } from "react"
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InlineError,
  minLength,
  required,
  useFormValidation,
} from "@/hooks/useFormValidation"
import type { UseSecretFields } from "@/hooks/useSecretFields"
import { SECRET_CATEGORIES } from "@/types"
import type { SecretCategory, SecretFieldDraft, SecretFieldType, SecretForm } from "@/types"
import { createCustomFieldDraft, createSecretFieldDrafts } from "@/constants"
import { SecretFieldList } from "./SecretFieldList"

interface SecretFormProps {
  form: SecretForm
  onChange: (form: SecretForm) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  isEditing: boolean
  submitting: boolean
  editingSecretId?: string
  fieldDrafts?: SecretFieldDraft[]
  onFieldDraftsChange?: (drafts: SecretFieldDraft[]) => void
  fieldService?: UseSecretFields
}

const CATEGORY_LABEL: Record<SecretCategory, string> = {
  aI: "AI",
  cloud: "Cloud",
  search: "Search",
  database: "Database",
  devTool: "Dev Tool",
  payment: "Payment",
  custom: "Custom",
}

const QUICK_FIELD_TYPES: SecretFieldType[] = ["text", "url", "email", "number", "note"]

// ── Tag Chip Input ───────────────────────────────────────────────────
function TagChipInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const tags = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : []

  function addTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    const next = tags.includes(tag) ? tags : [...tags, tag]
    onChange(next.join(", "))
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag).join(", "))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (inputValue.trim()) {
        addTag(inputValue)
        setInputValue("")
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-[34px] px-2.5 py-1 rounded-lg border border-input bg-transparent cursor-text transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) {
            addTag(inputValue)
            setInputValue("")
          }
        }}
        placeholder={tags.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[80px] bg-transparent text-xs outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}

// ── Section Card ─────────────────────────────────────────────────────
function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-border/40 bg-card/40 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
          {title && (
            <span className="text-[11px] font-semibold text-card-foreground uppercase tracking-wide">
              {title}
            </span>
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

// ── Form Label ───────────────────────────────────────────────────────
function FormLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] uppercase font-mono text-muted-foreground mb-1.5">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  )
}

export function SecretForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  submitting,
  editingSecretId,
  fieldDrafts,
  onFieldDraftsChange,
  fieldService,
}: SecretFormProps) {
  const { t } = useTranslation()

  const SECRET_RULES = {
    name: [required(t("secretForm.validation.nameRequired")), minLength(1, t("secretForm.validation.nameEmpty"))],
  } as const

  const { errors, validate, validateField, clearFieldError } =
    useFormValidation<SecretForm>(SECRET_RULES)

  const handleCategoryChange = useCallback(
    (val: string) => {
      const category = val as SecretCategory
      onChange({ ...form, category })
      if (!isEditing && onFieldDraftsChange) {
        onFieldDraftsChange(createSecretFieldDrafts(category))
      }
    },
    [form, isEditing, onChange, onFieldDraftsChange],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate(form)) {
      onSubmit(e)
    }
  }

  function updateDraft(id: string, patch: Partial<SecretFieldDraft>) {
    if (!fieldDrafts || !onFieldDraftsChange) return
    onFieldDraftsChange(
      fieldDrafts.map((draft) =>
        draft.id === id ? { ...draft, ...patch } : draft,
      ),
    )
  }

  function addCustomDraft() {
    if (!fieldDrafts || !onFieldDraftsChange) return
    onFieldDraftsChange([...fieldDrafts, createCustomFieldDraft(fieldDrafts.length)])
  }

  function removeDraft(id: string) {
    if (!fieldDrafts || !onFieldDraftsChange) return
    onFieldDraftsChange(fieldDrafts.filter((draft) => draft.id !== id))
  }

  const commonDrafts = fieldDrafts?.filter((draft) => draft.section !== "environment") ?? []
  const environmentDrafts = fieldDrafts?.filter((draft) => draft.section === "environment") ?? []

  return (
    <div className="max-w-3xl mx-auto">
      {/* ─ Header ── */}
      <div className="pb-5 mb-5 border-b border-border/50">
        <h2 className="text-sm font-semibold text-card-foreground">
          {isEditing ? t("secretForm.editTitle") : t("secretForm.newTitle")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isEditing
            ? t("secretForm.editDescription")
            : t("secretForm.newDescription")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">

        {/* ── Basic Info Section ── */}
        <SectionCard title={t("secretForm.basicInfo") || "Basic Info"}>
          <div className="space-y-4">
            {/* Service Name + Category */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
              <div>
                <FormLabel required>{t("secretForm.serviceName")}</FormLabel>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    onChange({ ...form, name: e.target.value })
                    clearFieldError("name")
                  }}
                  onBlur={() => validateField("name", form)}
                  placeholder={t("secretForm.namePlaceholder")}
                  className="h-[34px] text-xs"
                />
                <InlineError error={errors.name} />
              </div>
              <div>
                <FormLabel>{t("secretForm.category")}</FormLabel>
                <Select value={form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-[34px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectGroup>
                      {SECRET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {CATEGORY_LABEL[cat]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <FormLabel>{t("secretForm.tags")}</FormLabel>
              <TagChipInput
                value={form.tags}
                onChange={(val) => onChange({ ...form, tags: val })}
                placeholder={t("secretForm.tagsPlaceholder")}
              />
            </div>
          </div>
        </SectionCard>

          {/* ── Fields Section ── */}
          {isEditing && editingSecretId && fieldService ? (
            <SectionCard title={t("secretForm.templateFields")}>
              <SecretFieldList secretId={editingSecretId} secretName={form.name} fields={fieldService} />
            </SectionCard>
          ) : !isEditing && fieldDrafts && onFieldDraftsChange ? (
            <SectionCard
              title={t("secretForm.templateFields")}
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomDraft}
                  className="h-7 text-[10px] rounded-full border-border/50"
                >
                  <PlusIcon className="size-3 mr-1" />
                  {t("secretForm.addCustomField")}
                </Button>
              }
            >
              <div className="space-y-0">
                {commonDrafts.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/60 mb-2">
                      {t("secretForm.commonSection")}
                    </div>
                    {commonDrafts.map((draft) => (
                      <FieldDraftRow
                        key={draft.id}
                        draft={draft}
                        onUpdate={updateDraft}
                        onRemove={removeDraft}
                        canRemove={Boolean(draft.custom)}
                      />
                    ))}
                  </div>
                )}

                {environmentDrafts.length > 0 && (
                  <div className={commonDrafts.length > 0 ? "mt-5" : ""}>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground/60 mb-2">
                      {t("secretForm.envSection")}
                    </div>
                    {environmentDrafts.map((draft) => (
                      <FieldDraftRow
                        key={draft.id}
                        draft={draft}
                        onUpdate={updateDraft}
                        onRemove={removeDraft}
                        canRemove={Boolean(draft.custom)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          ) : null}

        {/* ── Action Bar ── */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            disabled={submitting}
          >
            {t("secretForm.cancel")}
          </Button>
          <Button
            type="submit"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            {isEditing ? t("secretForm.saveChanges") : t("secretForm.create")}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── Field Draft Row ──────────────────────────────────────────────────
interface FieldDraftRowProps {
  draft: SecretFieldDraft
  onUpdate: (id: string, patch: Partial<SecretFieldDraft>) => void
  onRemove: (id: string) => void
  canRemove: boolean
}

function FieldDraftRow({ draft, onUpdate, onRemove, canRemove }: FieldDraftRowProps) {
  const { t } = useTranslation()
  const isSecret = draft.sensitive || draft.fieldType === "secret" || draft.fieldType === "json"

  return (
    <div className="grid grid-cols-[120px_1fr_auto_28px] gap-3 items-center py-2.5 border-b border-border/30 last:border-b-0">
      {/* Label + type hint */}
      <div className="min-w-0">
        {draft.custom ? (
          <Input
            value={draft.label}
            onChange={(e) => onUpdate(draft.id, { label: e.target.value })}
            placeholder={t("secretForm.customLabelPlaceholder")}
            className="h-7 text-xs"
          />
        ) : (
          <div className="h-7 flex items-center gap-1 min-w-0">
            <span className="text-xs font-medium truncate">{draft.label}</span>
            {draft.required && <span className="text-rose-500 text-[10px]">*</span>}
          </div>
        )}
        <div className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/40 mt-0.5">
          {draft.fieldType}{draft.sensitive ? " · encrypted" : ""}
        </div>
      </div>

      {/* Value input */}
      <Input
        type={isSecret ? "password" : "text"}
        value={draft.value}
        onChange={(e) => onUpdate(draft.id, { value: e.target.value })}
        placeholder={draft.placeholder ?? t("secretForm.valuePlaceholder")}
        className={`h-7 text-xs ${isSecret ? "font-mono" : ""}`}
      />

      {/* ENV name or nothing */}
      <div className="min-w-[100px]">
        {draft.envName ? (
          <code className="text-[10px] font-mono text-muted-foreground truncate block">
            {draft.envName}
          </code>
        ) : null}
      </div>

      {/* Remove button */}
      <div className="flex items-center justify-end h-7">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(draft.id)}
            className="h-6 w-6 text-muted-foreground hover:text-rose-500"
            aria-label={t("secretForm.removeField")}
          >
            <Trash2Icon className="size-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
