import type { MiddlewareHandler } from "astro"
import {
  MASTER_AUTH_COOKIE,
  isMasterCookieValid,
  isMasterPasswordEnabled,
  sanitizeNextPath,
} from "@/lib/master-auth"

const MASTER_LOGIN_PATH = "/master-login"

function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_astro/") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]+$/i.test(pathname)
  )
}

function isMasterAuthBypassedApi(pathname: string): boolean {
  if (pathname === "/api/email/send") return true
  if (pathname === "/api/files/upload") return true
  if (pathname.startsWith("/api/files/") && pathname !== "/api/files/list") {
    return true
  }
  return false
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!isMasterPasswordEnabled()) return next()

  const { pathname, search } = context.url
  if (pathname === MASTER_LOGIN_PATH || isStaticAssetPath(pathname)) {
    return next()
  }

  const cookieValue = context.cookies.get(MASTER_AUTH_COOKIE)?.value
  if (isMasterCookieValid(cookieValue)) {
    return next()
  }

  if (pathname.startsWith("/api/")) {
    if (isMasterAuthBypassedApi(pathname)) {
      return next()
    }
    return new Response(JSON.stringify({ error: "Master password required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const nextPath = sanitizeNextPath(`${pathname}${search}`)
  return context.redirect(`${MASTER_LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`)
}
