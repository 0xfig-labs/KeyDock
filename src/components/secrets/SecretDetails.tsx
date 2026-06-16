import { PencilIcon, Trash2Icon } from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSecretFields } from "@/hooks/useSecretFields"
import type { Secret } from "@/types"
import { SecretFieldList } from "./SecretFieldList"

interface SecretDetailsProps {
  secret: Secret
  onEdit: () => void
  onDelete: () => void
}

export function SecretDetails({
  secret,
  onEdit,
  onDelete,
}: SecretDetailsProps) {
  const { t } = useTranslation()
  const fieldService = useSecretFields()

  useEffect(() => {
    void fieldService.refresh(secret.id)
  }, [secret.id])

  return (
    <div className="space-y-6">
      {/* Service header */}
      <div className="flex items-start justify-between gap-4 gap-y-2 pb-4 border-b border-border flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground break-all min-w-0">
              {secret.name}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono border-border text-muted-foreground shrink-0"
            >
              {secret.category}
            </Badge>
          </div>

        </div>

        <div className="flex items-center justify-end gap-1 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-foreground"
            title={t("secretDetails.editService")}
          >
            <PencilIcon className="size-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/20"
            title={t("secretDetails.deleteService")}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Tags */}
      {(secret.tags ?? []).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            {t("secretDetails.tags")}
          </span>
          {(secret.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border border-border"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {secret.notes && (
        <div className="bg-muted/60 border border-border rounded-lg p-3 text-xs space-y-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            Notes
          </span>
          <p className="text-card-foreground whitespace-pre-wrap">
            {secret.notes}
          </p>
        </div>
      )}

      {/* Fields block */}
      <SecretFieldList
        secretId={secret.id}
        secretName={secret.name}
        fields={fieldService}
      />
    </div>
  )
}
