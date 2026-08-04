import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getVersion } from "@tauri-apps/api/app"
import { LockScreen } from "@/components/layout/LockScreen"
import { Sidebar } from "@/components/layout/Sidebar"
import { ToastView } from "@/components/layout/ToastView"
import { AuditTab } from "@/components/audit/AuditTab"
import { DashboardTab } from "@/components/dashboard/DashboardTab"
import { SecretsTab } from "@/components/secrets/SecretsTab"
import { SettingsTab } from "@/components/settings/SettingsTab"
import { PresetsTab } from "@/components/presets/PresetsTab"
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard"
import { useAudit } from "@/hooks/useAudit"
import { useSecrets } from "@/hooks/useSecrets"
import { useToast } from "@/hooks/useToast"
import { useUpdate } from "@/hooks/useUpdate"
import { useVault } from "@/hooks/useVault"
import { useTheme } from "@/hooks/useTheme"
import { usePresets } from "@/hooks/usePresets"
import { ensureKeydockBinary, ensureShellHook } from "@/lib/tauri"

type Tab = "dashboard" | "secrets" | "presets" | "audit" | "settings"

export function App() {
  useTheme()

  const vault = useVault()
  const secrets = useSecrets()
  const presets = usePresets()
  const audit = useAudit()
  const { t } = useTranslation()
  const { show } = useToast()
  const { update, checkForUpdates, installUpdate } = useUpdate()
  const [activeTab, setActiveTab] = useState<Tab>("dashboard")
  const [selectedSecretId, setSelectedSecretId] = useState("")
  const [currentVersion, setCurrentVersion] = useState("")
  const [showOnboarding, setShowOnboarding] = useState(false)
  const onboardingChecked = useRef(false)

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(() => setCurrentVersion(""))
  }, [])

  useEffect(() => {
    if (!vault.ready) return
    void secrets.refresh()
    void presets.refresh()
    ensureShellHook().catch(() => {})
    ensureKeydockBinary().catch(() => {})
  }, [
    vault.ready,
    secrets.refresh,
    presets.refresh,
  ])

  // Detect first-time user after initial data load
  useEffect(() => {
    if (!vault.ready || onboardingChecked.current) return
    if (secrets.loading || presets.loading) return
    onboardingChecked.current = true
    if (secrets.secrets.length === 0 && presets.presets.length === 0) {
      setShowOnboarding(true)
    }
  }, [vault.ready, secrets.loading, presets.loading, secrets.secrets.length, presets.presets.length])

  async function handleLock() {
    try {
      await vault.lock()
      setActiveTab("dashboard")
    } catch (e) {
      show(extractMessage(e), "error")
    }
  }

  const handleCheckUpdate = useCallback(async () => {
    const result = await checkForUpdates()
    if (result.ok && result.available) {
      show(t("settings.updateAvailable"), "info")
    } else if (result.ok) {
      show(t("settings.upToDate"), "success")
    } else {
      show(t("settings.updateError"), "error")
    }
  }, [checkForUpdates, show, t])

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
  }

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false)
    await secrets.refresh()
    await presets.refresh()
  }, [secrets.refresh, presets.refresh])

  if (!vault.ready) {
    return (
      <>
        <LockScreen vault={vault} />
        <ToastView />
      </>
    )
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex antialiased">
        <OnboardingWizard onComplete={handleOnboardingComplete} />
        <ToastView />
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex antialiased">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        secretCount={secrets.secrets.length}
        presetCount={presets.presets.length}
        onLockClick={handleLock}
        updateStatus={update.status}
        onCheckUpdate={handleCheckUpdate}
      />
 
      <main className="flex-1 min-w-0 h-screen overflow-hidden bg-background flex flex-col">
        {activeTab === "dashboard" && (
          <DashboardTab
            secrets={secrets}
            audit={audit}
            presetCount={presets.presets.length}
            onSelectTab={setActiveTab}
          />
        )}
        {activeTab === "secrets" && (
          <SecretsTab
            secrets={secrets}
            selectedSecretId={selectedSecretId}
            onSelectSecret={setSelectedSecretId}
          />
        )}
        {activeTab === "presets" && (
          <PresetsTab
            vaultReady={vault.ready}
          />
        )}
        {activeTab === "audit" && (
          <AuditTab logs={audit.logs} onRefresh={audit.refresh} />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            update={update}
            currentVersion={currentVersion}
            onCheckUpdate={handleCheckUpdate}
            onInstallUpdate={installUpdate}
          />
        )}
      </main>

      <ToastView />
    </div>
  )
}

function extractMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
