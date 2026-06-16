import { useCallback, useEffect, useState } from "react"
import { check } from "@tauri-apps/plugin-updater"

export interface UpdateInfo {
  /** True when a newer version is available */
  available: boolean
  /** The new version string (semver) */
  version?: string
  /** Release notes / body */
  body?: string
  /** True while downloading the update */
  downloading: boolean
  /** Download progress (0-1), undefined until first progress event */
  progress?: number
  /** Human-readable status message */
  status: "idle" | "checking" | "available" | "downloading" | "installing" | "done" | "error"
  /** Error message when status is "error" */
  errorMessage?: string
}

export type CheckResult =
  | { ok: true; available: boolean }
  | { ok: false; error: string }

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo>({
    available: false,
    downloading: false,
    status: "idle",
  })

  const checkForUpdates = useCallback(async (): Promise<CheckResult> => {
    setUpdate((prev) => ({ ...prev, status: "checking", errorMessage: undefined }))
    try {
      const result = await check()
      if (result?.available) {
        setUpdate({
          available: true,
          version: result.version,
          body: result.body,
          downloading: false,
          status: "available",
        })
        return { ok: true, available: true }
      } else {
        setUpdate({
          available: false,
          downloading: false,
          status: "idle",
        })
        return { ok: true, available: false }
      }
    } catch (e) {
      const message = extractUpdaterError(e)
      console.error("[updater] check failed:", e)
      setUpdate((prev) => ({
        ...prev,
        status: "error",
        errorMessage: message,
      }))
      return { ok: false, error: message }
    }
  }, [])

  const installUpdate = useCallback(async () => {
    try {
      const result = await check()
      if (!result?.available) return

      setUpdate((prev) => ({ ...prev, status: "downloading", downloading: true, errorMessage: undefined }))

      let totalBytes = 0
      let downloadedBytes = 0

      await result.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started": {
            totalBytes = event.data.contentLength ?? 0
            downloadedBytes = 0
            if (totalBytes > 0) setUpdate((prev) => ({ ...prev, progress: 0 }))
            break
          }
          case "Progress": {
            downloadedBytes += event.data.chunkLength ?? 0
            if (totalBytes > 0) {
              setUpdate((prev) => ({ ...prev, progress: Math.min(downloadedBytes / totalBytes, 1) }))
            }
            break
          }
          case "Finished":
            setUpdate((prev) => ({ ...prev, progress: 1 }))
            break
        }
      })

      setUpdate((prev) => ({ ...prev, status: "installing", downloading: false }))
    } catch (e) {
      const message = extractUpdaterError(e)
      console.error("[updater] install failed:", e)
      setUpdate((prev) => ({
        ...prev,
        downloading: false,
        status: "error",
        errorMessage: message,
      }))
    }
  }, [])

  // Check for updates once on mount (with a short delay so the UI loads first)
  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 5000)
    return () => clearTimeout(timer)
  }, [checkForUpdates])

  return { update, checkForUpdates, installUpdate }
}

function extractUpdaterError(e: unknown): string {
  if (typeof e === "string") return e
  if (e instanceof Error) {
    const m = e.message.toLowerCase()
    // Common Tauri updater error patterns
    if (m.includes("timeout") || m.includes("timed out") || m.includes("eai_again") || m.includes("dns"))
      return "network_error"
    if (m.includes("signature") || m.includes("publickey") || m.includes("pubkey"))
      return "signature_error"
    if (m.includes("tls") || m.includes("ssl") || m.includes("certificate"))
      return "tls_error"
    if (m.includes("json") || m.includes("parse") || m.includes("unexpected"))
      return "parse_error"
    if (m.includes("gzip") || m.includes("decompress") || m.includes("zlib"))
      return "check_error"
    return e.message
  }
  return "unknown_error"
}
