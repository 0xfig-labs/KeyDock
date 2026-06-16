import { type FormEvent, useEffect, useState } from "react"
import { CalendarIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  InlineError,
  minLength,
  pattern,
  required,
  useFormValidation,
} from "@/hooks/useFormValidation"
import { nameToScreamingSnakeCase } from "@/constants"
import type { SecretField, SecretFieldInput, SecretFieldType } from "@/types"

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const FIELD_TYPE_OPTIONS: { value: SecretFieldType; label: string }[] = [
  { value: "secret", label: "Secret" },
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "json", label: "JSON" },
  { value: "env", label: "Env" },
  { value: "note", label: "Note" },
  { value: "file", label: "File" },
]

export interface SecretFieldForm {
  label: string
  fieldType: SecretFieldType
  value: string
  sensitive: boolean
  envName: string
  section: string
  expiresAt: string
}

const emptyFieldForm: SecretFieldForm = {
  label: "",
  fieldType: "text",
  value: "",
  sensitive: false,
  envName: "",
  section: "common",
  expiresAt: "",
}

function fieldTypeSensitiveDefault(fieldType: SecretFieldType): boolean {
  switch (fieldType) {
    case "secret":
    case "json":
      return true
    case "text":
    case "url":
    case "email":
    case "number":
    case "note":
      return false
    case "env":
    case "file":
      return true
  }
}

interface SecretFieldEditorProps {
  form: SecretFieldForm
  onChange: (form: SecretFieldForm) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
  submitting: boolean
  editingField?: boolean
  secretName?: string
  onDelete?: () => void
  onReveal?: () => Promise<string | undefined>
  valuePreview?: string
}

export function SecretFieldEditor({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  editingField,
  secretName,
  onDelete,
  onReveal,
  valuePreview,
}: SecretFieldEditorProps) {
  const [showValue, setShowValue] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const isEnvSection = form.section === "environment"
  const isSensitiveType = form.sensitive || form.fieldType === "secret" || form.fieldType === "json"

  useEffect(() => {
    if (form.section === "common") {
      if (form.envName || form.sensitive) {
        onChange({ ...form, envName: "", sensitive: false })
      }
    } else if (form.section === "environment" && !form.envName && secretName) {
      const derived = nameToScreamingSnakeCase(secretName)
      if (derived) {
        onChange({ ...form, envName: derived })
      }
    }
  }, [form.section])

  const rules = {
    label: [
      required("Field label is required"),
      minLength(1, "Field label cannot be empty"),
    ],
    envName: [
      pattern(
        /^[A-Z_][A-Z0-9_]*$/,
        "Invalid env name format (use e.g. MY_VAR)",
      ),
    ],
  }

  const { errors, validate, validateField, clearFieldError } =
    useFormValidation<SecretFieldForm>(rules)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate(form)) {
      onSubmit(e)
    }
  }

  function handleFieldTypeChange(value: SecretFieldType) {
    const newSensitive = form.section === "common" ? false : fieldTypeSensitiveDefault(value)
    onChange({
      ...form,
      fieldType: value,
      sensitive: newSensitive,
    })
  }

  async function handleToggleShow() {
    if (!showValue && isSensitiveType && editingField && onReveal) {
      setRevealing(true)
      try {
        const realValue = await onReveal()
        if (realValue !== undefined) {
          onChange({ ...form, value: realValue })
        }
      } catch {
      } finally {
        setRevealing(false)
      }
    }
    setShowValue(!showValue)
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-3 overflow-hidden">
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              Label *
            </label>
            <Input
              value={form.label}
              onChange={(e) => {
                onChange({ ...form, label: e.target.value })
                clearFieldError("label")
              }}
              onBlur={() => validateField("label", form)}
              placeholder="e.g. API Key"
              className="h-8 text-xs bg-muted/80"
            />
            <InlineError error={errors.label} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              Field Type
            </label>
            <Select value={form.fieldType} onValueChange={handleFieldTypeChange}>
              <SelectTrigger className="h-8 text-xs bg-muted/80 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase font-mono text-muted-foreground">
            Value {editingField ? "" : "*"}
          </label>
          <div className="relative">
            {form.fieldType === "note" ? (
              <Textarea
                value={form.value}
                onChange={(e) => {
                  onChange({ ...form, value: e.target.value })
                }}
                placeholder="Field value"
                className="text-xs bg-muted/80 font-mono min-h-[60px]"
              />
            ) : (
              <Input
                type={isSensitiveType && !showValue ? "password" : "text"}
                value={form.value}
                onChange={(e) => {
                  onChange({ ...form, value: e.target.value })
                }}
                placeholder={
                  editingField
                    ? isSensitiveType
                      ? valuePreview || "••••••••"
                      : "Leave empty to keep current value"
                    : "Field value"
                }
                className="h-8 text-xs bg-muted/80 font-mono pr-9"
              />
            )}
            {isSensitiveType && form.fieldType !== "note" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleToggleShow}
                disabled={revealing}
                className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
                aria-label={showValue ? "Hide value" : (editingField ? "Reveal value" : "Show value")}
              >
                {revealing ? (
                  <span className="size-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : showValue ? (
                  <EyeOffIcon className="size-3.5" />
                ) : (
                  <EyeIcon className="size-3.5" />
                )}
              </Button>
            )}
          </div>
          {form.fieldType === "url" && form.value && !form.value.startsWith("http") && (
            <p className="text-[9px] text-amber-500 dark:text-amber-400">
              URL should start with http:// or https://
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              Section
            </label>
            <Select
              value={form.section}
              onValueChange={(value) =>
                onChange({
                  ...form,
                  section: value,
                  envName: value === "common" ? "" : (form.envName || (value === "environment" && secretName ? nameToScreamingSnakeCase(secretName) : "")),
                  sensitive: value === "common" ? false : form.sensitive,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs bg-muted/80 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="common">Common field</SelectItem>
                <SelectItem value="environment">Encrypted / ENV field</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              Env Variable Name
            </label>
            <Input
              value={form.envName}
              onChange={(e) => {
                onChange({ ...form, envName: e.target.value.toUpperCase() })
                clearFieldError("envName")
              }}
              onBlur={() => validateField("envName", form)}
              placeholder={isEnvSection ? "e.g. MY_API_KEY" : "Common fields do not use ENV"}
              className="h-8 text-xs bg-muted/80 font-mono"
              disabled={!isEnvSection}
            />
            <InlineError error={errors.envName} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Switch
            id="sensitive-switch"
            checked={form.sensitive}
            disabled={!isEnvSection}
            onCheckedChange={(checked) =>
              onChange({ ...form, sensitive: checked })
            }
          />
          <Label
            htmlFor="sensitive-switch"
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Sensitive / encrypted value
          </Label>
        </div>

        {isEnvSection && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] uppercase font-mono text-muted-foreground">
              Expiration Date
            </label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger className="h-8 flex-1 inline-flex items-center justify-start gap-2 rounded-lg border border-border/60 bg-muted/80 px-2.5 text-xs font-normal text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground transition-colors">
                  <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
                  {form.expiresAt ? (
                    <span>{formatDate(new Date(form.expiresAt + "T00:00:00"))}</span>
                  ) : (
                    <span className="text-muted-foreground/60">Pick a date</span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.expiresAt ? new Date(form.expiresAt + "T00:00:00") : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const y = date.getFullYear()
                        const m = String(date.getMonth() + 1).padStart(2, "0")
                        const d = String(date.getDate()).padStart(2, "0")
                        onChange({ ...form, expiresAt: `${y}-${m}-${d}` })
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().toDateString())}
                  />
                </PopoverContent>
              </Popover>
              {form.expiresAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onChange({ ...form, expiresAt: "" })}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Clear expiration date"
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
            </div>
            {form.expiresAt && (() => {
              const d = new Date(form.expiresAt + "T23:59:59")
              const now = new Date()
              const isExpired = d < now
              return (
                <p className={`text-[9px] font-mono ${isExpired ? "text-rose-500 dark:text-rose-400" : "text-muted-foreground"}`}>
                  {isExpired ? "Expired" : "Expires"}: {formatDate(d)}
                </p>
              )
            })()}
            <p className="text-[9px] text-muted-foreground/60">
              Optional. Set a date to mark this key as expired after that day.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/20"
              >
                Delete field
              </Button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={submitting}
          >
            {editingField ? "Save changes" : "Add field"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export { emptyFieldForm }
