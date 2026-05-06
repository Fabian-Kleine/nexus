import { createHash, timingSafeEqual } from "crypto"

export const MASTER_AUTH_COOKIE = "nexus_master_auth"
const MASTER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function getConfiguredMasterPassword(): string | null {
  const value = import.meta.env.MASTER_PASSWORD
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isMasterPasswordEnabled(): boolean {
  return getConfiguredMasterPassword() !== null
}

export function getMasterPasswordHash(): string | null {
  const password = getConfiguredMasterPassword()
  return password ? sha256(password) : null
}

export function verifyMasterPassword(candidate: string): boolean {
  const expectedHash = getMasterPasswordHash()
  if (!expectedHash) return true
  return safeEqual(sha256(candidate), expectedHash)
}

export function isMasterCookieValid(cookieValue: string | undefined): boolean {
  const expectedHash = getMasterPasswordHash()
  if (!expectedHash) return true
  if (!cookieValue) return false
  return safeEqual(cookieValue, expectedHash)
}

export function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath) return "/dashboard"
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard"
  }
  if (nextPath.startsWith("/master-login")) {
    return "/dashboard"
  }
  return nextPath
}

export function getMasterAuthCookieOptions(url: URL) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: url.protocol === "https:",
    maxAge: MASTER_COOKIE_MAX_AGE_SECONDS,
  }
}
