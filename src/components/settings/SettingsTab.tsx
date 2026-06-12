import { useTranslation } from "react-i18next"
import { useTheme } from "@/hooks/useTheme"
import type { UpdateInfo } from "@/hooks/useUpdate"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import i18n from "@/i18n/config"

interface SettingsTabProps {
  update: UpdateInfo
  currentVersion: string
  onCheckUpdate: () => void
  onInstallUpdate: () => void
}

/** Map updater error codes from useUpdate to translated message and raw detail. */
function formatUpdateError(t: (key: string) => string, errorMessage?: string): { summary: string; detail: string | null } {
  if (!errorMessage) return { summary: t("settings.updateError"), detail: null }

  switch (errorMessage) {
    case "network_error":
      return { summary: t("settings.updateNetworkError"), detail: "network_error" }
    case "signature_error":
      return { summary: t("settings.updateSignatureError"), detail: "signature_error" }
    case "tls_error":
      return { summary: t("settings.updateTlsError"), detail: "tls_error" }
    case "parse_error":
      return { summary: t("settings.updateParseError"), detail: "parse_error" }
    default:
      return { summary: t("settings.updateError"), detail: errorMessage }
  }
}

export function SettingsTab({
  update,
  currentVersion,
  onCheckUpdate,
  onInstallUpdate,
}: SettingsTabProps) {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()

  const isChinese = i18n.language === "zh"
  const isDark = theme === "dark"

  function toggleLanguage(checked: boolean) {
    i18n.changeLanguage(checked ? "zh" : "en")
  }

  function toggleTheme(checked: boolean) {
    setTheme(checked ? "dark" : "light")
  }

  return (
    <div className="flex-1 p-8 max-w-2xl overflow-y-auto">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t("settings.title")}
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
            {t("settings.theme")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("settings.themeDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isDark ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.light")}
              </span>
              <Switch
                checked={isDark}
                onCheckedChange={toggleTheme}
                size="default"
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isDark ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.dark")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
            {t("settings.language")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("settings.languageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-medium transition-colors ${
                  !isChinese ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.english")}
              </span>
              <Switch
                checked={isChinese}
                onCheckedChange={toggleLanguage}
                size="default"
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isChinese ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {t("settings.chinese")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            {t("settings.version")}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t("settings.versionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("settings.currentVersion")}</span>
                <span className="text-xs font-mono font-medium text-foreground">
                  v{currentVersion || "0.4.1"}
                </span>
              </div>

              {update.status === "idle" && (
                <button
                  onClick={onCheckUpdate}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  {t("settings.checkForUpdates")}
                </button>
              )}

              {update.status === "checking" && (
                <span className="text-xs text-muted-foreground">{t("settings.checking")}</span>
              )}

              {update.status === "available" && update.version && (
                <button
                  onClick={onInstallUpdate}
                  className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  {t("settings.installUpdate")}
                </button>
              )}

              {update.status === "downloading" && (
                <span className="text-xs text-muted-foreground">
                  {t("settings.downloading")}
                  {update.progress !== undefined && ` ${Math.round(update.progress * 100)}%`}
                </span>
              )}

              {update.status === "installing" && (
                <span className="text-xs text-muted-foreground">{t("settings.installing")}</span>
              )}

              {update.status === "done" && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("settings.updateDone")}</span>
              )}

              {update.status === "error" && (() => {
                const { summary, detail } = formatUpdateError(t, update.errorMessage)
                const RELEASES_URL = "https://github.com/0xfig-labs/KeyDock/releases"
                const releaseUrl = update.version
                  ? `${RELEASES_URL}/tag/v${update.version}`
                  : RELEASES_URL
                return (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-500">{summary}</span>
                      <button
                        onClick={onCheckUpdate}
                        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                      >
                        {t("settings.checkForUpdates")}
                      </button>
                    </div>
                    {detail && (
                      <span className="text-[10px] text-red-400/70 font-mono break-all select-text">
                        {detail}
                      </span>
                    )}
                    {update.available && update.version && (
                      <a
                        href={releaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        ↓ {t("settings.downloadFromGitHub")}
                      </a>
                    )}
                  </div>
                )
              })()}
            </div>

            {update.status === "available" && (
              <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  {t("settings.newVersion", { version: update.version })}
                </p>
                {update.body && (
                  <pre className="text-[10px] text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap font-mono leading-relaxed">
                    {update.body}
                  </pre>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
