import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConfirm } from "@/components/ui/confirm-dialog"
import type { UseSecretFields } from "@/hooks/useSecretFields"
import type { SecretField, SecretFieldInput, SecretFieldPurpose, SecretFieldType } from "@/types"
import { SecretFieldRow } from "./SecretFieldRow"
import { SecretFieldEditor, emptyFieldForm } from "./SecretFieldEditor"
import type { SecretFieldForm } from "./SecretFieldEditor"

interface SecretFieldListProps {
  secretId: string
  secretName: string
  fields: UseSecretFields
}

export function SecretFieldList({
  secretId,
  secretName,
  fields: fieldService,
}: SecretFieldListProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<SecretFieldForm>(emptyFieldForm)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [editingFieldLabel, setEditingFieldLabel] = useState<string>("")
  const editingFieldRef = useRef<SecretField | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const confirm_ = useConfirm()

  const handleRevealForEdit = useCallback(async () => {
    const field = editingFieldRef.current
    if (!field) return undefined
    return await fieldService.reveal(field.id)
  }, [fieldService])

  const editingValuePreview = editingFieldRef.current?.valuePreview ?? ""

  const sortedFields = useMemo(
    () =>
      [...fieldService.fields].sort((a, b) => a.sortOrder - b.sortOrder),
    [fieldService.fields],
  )

  const openAddForm = useCallback(() => {
    setForm(emptyFieldForm)
    setEditingFieldId(null)
    setEditingFieldLabel("")
    setShowForm(true)
  }, [])

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingFieldId(null)
    setEditingFieldLabel("")
    setForm(emptyFieldForm)
  }, [])

  const startEdit = useCallback((field: SecretField) => {
    editingFieldRef.current = field
    setForm({
      label: field.label,
      fieldType: field.fieldType,
      value: field.sensitive ? "" : (field.valuePreview ?? ""),
      sensitive: field.sensitive,
      envName: field.envName ?? "",
      section: inferFieldSection(field),
      expiresAt: field.expiresAt ?? "",
    })
    setEditingFieldId(field.id)
    setEditingFieldLabel(field.label)
    setShowForm(true)
  }, [])

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (submitting) return

      const trimmedLabel = form.label.trim()
      if (!trimmedLabel) return

      setSubmitting(true)
      try {
        const input: SecretFieldInput = {
          label: trimmedLabel,
          fieldType: form.fieldType as SecretFieldType,
          value: form.value || null,
          sensitive: form.sensitive,
          envName: form.section === "environment" ? form.envName.trim() || null : null,
          purpose: (form.section === "environment" ? null : "metadata") as SecretFieldPurpose | null,
          section: form.section,
          sortOrder: null,
          enabled: true,
          expiresAt: form.expiresAt || null,
        }

        if (editingFieldId) {
          const updated = await fieldService.update(editingFieldId, input)
          if (updated) {
            closeForm()
          }
        } else {
          const created = await fieldService.create(secretId, input)
          if (created) {
            closeForm()
          }
        }
      } finally {
        setSubmitting(false)
      }
    },
    [submitting, form, editingFieldId, fieldService, secretId, closeForm],
  )

  const handleDelete = useCallback(
    async (field: SecretField) => {
      if (editingFieldId === field.id) {
        closeForm()
      }
      const ok = await confirm_({
        title: "Delete Field",
        message: `Delete field "${field.label}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      })
      if (!ok) return
      await fieldService.remove(field.id, field.label)
    },
    [fieldService, confirm_, closeForm, editingFieldId],
  )

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      const ids = sortedFields.map((f) => f.id)
      ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
      void fieldService.reorder(secretId, ids)
    },
    [sortedFields, fieldService, secretId],
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= sortedFields.length - 1) return
      const ids = sortedFields.map((f) => f.id)
      ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
      void fieldService.reorder(secretId, ids)
    },
    [sortedFields, fieldService, secretId],
  )

  const commonFields = sortedFields.filter((field) => inferFieldSection(field) !== "environment")
  const environmentFields = sortedFields.filter((field) => inferFieldSection(field) === "environment")
  const noFields = sortedFields.length === 0 && !showForm

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fields {sortedFields.length > 0 && <span className="font-normal text-muted-foreground/50 ml-1">· {sortedFields.length}</span>}
        </h3>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={openAddForm}
            className="h-7 text-xs border-border/60 bg-card/50 hover:bg-accent hover:border-border"
          >
            <PlusIcon className="size-3 mr-1" />
            Add field
          </Button>
        )}
      </div>

      {/* ── Editor (isolated from viewer) ── */}
      {showForm && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.03] overflow-hidden">
          {/* Context bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-500/15 bg-emerald-500/[0.04]">
            <div className="flex items-center gap-2">
              <PencilIcon className="size-3 text-emerald-500" />
              <span className="text-[10px] font-mono uppercase tracking-wide text-emerald-400">
                {editingFieldId ? `Editing: ${editingFieldLabel}` : "Adding new field"}
              </span>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="size-5 flex items-center justify-center rounded text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              aria-label="Close"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          {/* Editor body */}
          <div className="p-4">
            <SecretFieldEditor
              form={form}
              onChange={setForm}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              submitting={submitting}
              editingField={Boolean(editingFieldId)}
              secretName={secretName}
              onReveal={handleRevealForEdit}
              valuePreview={editingValuePreview}
              onDelete={
                editingFieldId
                  ? () => {
                      const field = fieldService.fields.find(
                        (f) => f.id === editingFieldId,
                      )
                      if (field) void handleDelete(field)
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {noFields && (
        <div className="p-8 border border-dashed rounded-lg border-border text-center">
          <p className="text-xs text-muted-foreground">
            No fields yet. Add fields like API Token, Account ID, Base URL.
          </p>
        </div>
      )}

      {/* ── Field sections (dimmed when editor is open) ── */}
      <div className={`space-y-5 transition-opacity duration-200 ${showForm ? "opacity-40 pointer-events-none select-none" : ""}`}>
        {commonFields.length > 0 && (
          <FieldSection
            title="Common fields"
            fields={commonFields}
            allFields={sortedFields}
            fieldService={fieldService}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )}

        {environmentFields.length > 0 && (
          <FieldSection
            title="Encrypted / ENV fields"
            fields={environmentFields}
            allFields={sortedFields}
            fieldService={fieldService}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}


function inferFieldSection(field: SecretField): string {
  if (field.section === "environment" || field.envName || field.sensitive) return "environment"
  return "common"
}

interface FieldSectionProps {
  title: string
  fields: SecretField[]
  allFields: SecretField[]
  fieldService: UseSecretFields
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onEdit: (field: SecretField) => void
  onDelete: (field: SecretField) => void
}

function FieldSection({
  title,
  fields,
  allFields,
  fieldService,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: FieldSectionProps) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
        {title} · {fields.length}
      </h4>
      <div className="space-y-0">
        {fields.map((field) => {
          const index = allFields.findIndex((item) => item.id === field.id)
          return (
            <div key={field.id} className="relative group">
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onMoveUp(index)}
                  disabled={index <= 0}
                  className="size-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUpIcon className="size-3" />
                </button>
                <button
                  onClick={() => onMoveDown(index)}
                  disabled={index >= allFields.length - 1}
                  className="size-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDownIcon className="size-3" />
                </button>
              </div>
              <SecretFieldRow
                field={field}
                revealed={fieldService.getRevealed(field.id)}
                onReveal={fieldService.reveal}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
