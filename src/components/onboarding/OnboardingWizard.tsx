import { useState, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  KeyIcon,
  SparklesIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createSecret,
  createSecretField,
  createPreset,
  addPresetEntry,
  deletePreset,
  deleteSecret,
} from "@/lib/tauri"
import { useToast } from "@/hooks/useToast"
import type { SecretCategory } from "@/types"
import { deriveEnvNameFromTemplate } from "@/constants"

// ── Service templates for onboarding ──────────────────────────────────

interface ServiceTemplate {
  name: string
  description: string
  category: SecretCategory
  fieldLabel: string
  fieldPlaceholder: string
  envNameTemplate: string
}

const SERVICES: ServiceTemplate[] = [
  {
    name: "OpenAI",
    description: "GPT-4, o4, DALL·E, Whisper",
    category: "aI",
    fieldLabel: "API Key",
    fieldPlaceholder: "sk-...",
    envNameTemplate: "{SERVICE}_API_KEY",
  },
  {
    name: "Anthropic",
    description: "Claude Sonnet, Opus, Haiku",
    category: "aI",
    fieldLabel: "API Key",
    fieldPlaceholder: "sk-ant-...",
    envNameTemplate: "{SERVICE}_API_KEY",
  },
  {
    name: "Cloudflare",
    description: "Workers, R2, D1, Pages",
    category: "cloud",
    fieldLabel: "API Token",
    fieldPlaceholder: "Bearer ...",
    envNameTemplate: "{SERVICE}_API_TOKEN",
  },
  {
    name: "Vercel",
    description: "Deployments, Edge Config, KV",
    category: "cloud",
    fieldLabel: "Token",
    fieldPlaceholder: "...",
    envNameTemplate: "{SERVICE}_TOKEN",
  },
  {
    name: "Supabase",
    description: "Postgres, Auth, Storage, Edge",
    category: "database",
    fieldLabel: "Service Role Key",
    fieldPlaceholder: "eyJ...",
    envNameTemplate: "{SERVICE}_SERVICE_ROLE_KEY",
  },
  {
    name: "Stripe",
    description: "Payments, Billing, Invoicing",
    category: "payment",
    fieldLabel: "Secret Key",
    fieldPlaceholder: "sk_live_...",
    envNameTemplate: "{SERVICE}_SECRET_KEY",
  },
  {
    name: "GitHub",
    description: "Repos, Actions, Packages",
    category: "devTool",
    fieldLabel: "Personal Access Token",
    fieldPlaceholder: "ghp_...",
    envNameTemplate: "{SERVICE}_TOKEN",
  },
]

type Step = "service" | "key" | "done"

interface OnboardingWizardProps {
  onComplete: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation()
  const { show } = useToast()
  const [step, setStep] = useState<Step>("service")
  const [selectedService, setSelectedService] = useState<ServiceTemplate | null>(null)
  const [keyValue, setKeyValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    presetName: string
    envName: string
  } | null>(null)
  const [copiedRun, setCopiedRun] = useState(false)
  const [copiedPlan, setCopiedPlan] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!selectedService || !keyValue.trim()) return
    setLoading(true)
    let secretId: string | undefined
    let presetId: string | undefined
    try {
      const secret = await createSecret({
        name: selectedService.name,
        category: selectedService.category,
        tags: [],
        notes: null,
      })
      secretId = secret.id

      const envName = deriveEnvNameFromTemplate(
        selectedService.name,
        selectedService.envNameTemplate,
      )
      const field = await createSecretField(secret.id, {
        label: selectedService.fieldLabel,
        fieldType: "secret",
        value: keyValue.trim(),
        sensitive: true,
        envName,
        purpose: "credential",
        section: "environment",
        enabled: true,
        expiresAt: null,
      })

      const presetName = `${selectedService.name.toLowerCase()}-dev`
      const preset = await createPreset(presetName, null)
      presetId = preset.id
      await addPresetEntry(preset.id, field.id, null)

      setResult({ presetName, envName })
      setStep("done")
    } catch (e) {
      if (presetId) await deletePreset(presetId).catch(() => {})
      if (secretId) await deleteSecret(secretId).catch(() => {})
      show(
        e instanceof Error ? e.message : t("onboarding.error", "Setup failed. Nothing was saved."),
        "error",
      )
    } finally {
      setLoading(false)
    }
  }, [selectedService, keyValue, show, t])

  const handleSelectService = useCallback((svc: ServiceTemplate) => {
    setSelectedService(svc)
    setKeyValue("")
    setStep("key")
  }, [])

  const handleBack = useCallback(() => {
    if (step === "key") {
      setStep("service")
    }
  }, [step])


  const runCmd = result ? `keydock run ${result.presetName} -- bun run dev` : ""
  const planCmd = result ? `keydock plan ${result.presetName} -- bun run dev` : ""

  const handleCopy = useCallback(async (text: string, which: "run" | "plan") => {
    try {
      await navigator.clipboard.writeText(text)
      if (which === "run") {
        setCopiedRun(true)
        setTimeout(() => setCopiedRun(false), 2000)
      } else {
        setCopiedPlan(true)
        setTimeout(() => setCopiedPlan(false), 2000)
      }
    } catch {
      // clipboard may fail in some Tauri contexts
    }
  }, [])

  // ── Step: Service selection ──────────────────────────────────────────

  if (step === "service") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5">
            <SparklesIcon className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
            {t("onboarding.serviceTitle", "Welcome to KeyDock")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t(
              "onboarding.serviceDesc",
              "Store your first API key in an encrypted vault, then inject it into any command with a single CLI line.",
            )}
          </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {SERVICES.map((svc) => (
            <button
              key={svc.name}
              onClick={() => handleSelectService(svc)}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card
                         hover:border-emerald-500/30 hover:bg-emerald-500/[0.03]
                         transition-colors text-left group"
            >
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5
                              group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                <KeyIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{svc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
              </div>
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onComplete}>
          {t("onboarding.skip", "Skip — I'll set up later")}
        </Button>
      </div>
    )
  }

  // ── Step: Enter key ──────────────────────────────────────────────────

  if (step === "key" && selectedService) {
    const envName = deriveEnvNameFromTemplate(
      selectedService.name,
      selectedService.envNameTemplate,
    )

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-muted mb-4">
            <KeyIcon className="size-5 text-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
            {t("onboarding.keyTitle", "Add your {{service}} key", {
              service: selectedService.name,
            })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(
              "onboarding.keyDesc",
              "Your key is encrypted locally with Argon2id + ChaCha20Poly1305. It never leaves this machine.",
            )}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-3">
            → {envName}
          </p>
        </div>

        <div className="w-full space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {selectedService.fieldLabel}
            </label>
            <Input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={selectedService.fieldPlaceholder}
              className="font-mono text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && keyValue.trim()) handleSubmit()
              }}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              {t("onboarding.back", "Back")}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!keyValue.trim() || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {loading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  {t("onboarding.createVault", "Create & Continue")}
                  <ArrowRightIcon className="size-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={onComplete}>
              {t("onboarding.skip", "Skip — I'll set up later")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step: Done ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-5">
          <CheckIcon className="size-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          {t("onboarding.doneTitle", "You're all set!")}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t(
            "onboarding.doneDesc",
            "Your first secret and preset are ready. Here's how to use them from the terminal:",
          )}
        </p>
      </div>

      <div className="w-full space-y-3 mb-6">
        {/* Run command */}
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TerminalIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("onboarding.runCmd", "Run with env injection")}
            </span>
          </div>
          <code className="block text-xs font-mono text-foreground mb-2 break-all">
            {runCmd}
          </code>
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleCopy(runCmd, "run")}
            className="h-7"
          >
            {copiedRun ? (
              <>
                <CheckIcon className="size-3 mr-1" />
                {t("onboarding.copied", "Copied")}
              </>
            ) : (
              <>
                <CopyIcon className="size-3 mr-1" />
                {t("onboarding.copy", "Copy")}
              </>
            )}
          </Button>
        </div>

        {/* Plan command */}
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ZapIcon className="size-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("onboarding.planCmd", "Preview before running")}
            </span>
          </div>
          <code className="block text-xs font-mono text-foreground mb-2 break-all">
            {planCmd}
          </code>
          <Button
            variant="outline"
            size="xs"
            onClick={() => handleCopy(planCmd, "plan")}
            className="h-7"
          >
            {copiedPlan ? (
              <>
                <CheckIcon className="size-3 mr-1" />
                {t("onboarding.copied", "Copied")}
              </>
            ) : (
              <>
                <CopyIcon className="size-3 mr-1" />
                {t("onboarding.copy", "Copy")}
              </>
            )}
          </Button>
        </div>
      </div>

      <Button
        size="sm"
        onClick={onComplete}
        className="bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {t("onboarding.goToDashboard", "Go to Dashboard")}
        <ArrowRightIcon className="size-3.5 ml-1.5" />
      </Button>
    </div>
  )
}
