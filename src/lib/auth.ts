import { db } from "./db"
import { apiKeys, type ApiKeyServices } from "./db/schema"
import { eq } from "drizzle-orm"
import { createHash } from "crypto"
import { MASTER_AUTH_COOKIE, isMasterCookieValid } from "./master-auth"

export type ServiceKey = keyof ApiKeyServices

export async function validateApiKey(
  request: Request,
  service: ServiceKey,
): Promise<(typeof apiKeys.$inferSelect) | null> {
  const raw = request.headers.get("x-api-key")
  if (!raw) return null

  const hash = createHash("sha256").update(raw).digest("hex")

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1)

  if (!key || !key.isActive) return null
  if (!key.services[service]) return null

  // Fire-and-forget last used update
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch(() => {})

  return key
}

export function isMasterAuthed(request: Request): boolean {
  const cookieHeader = request.headers.get("cookie") ?? ""
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=")
    if (idx === -1) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) cookies[k] = v
  }
  return isMasterCookieValid(cookies[MASTER_AUTH_COOKIE])
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
