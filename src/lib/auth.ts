import { db } from "./db"
import { apiKeys, type ApiKeyServices } from "./db/schema"
import { eq } from "drizzle-orm"
import { createHash } from "crypto"

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

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
