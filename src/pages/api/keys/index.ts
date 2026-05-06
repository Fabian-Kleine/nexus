export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { nanoid } from "nanoid"
import { createHash, randomBytes } from "crypto"
import { z } from "zod"
import { desc } from "drizzle-orm"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  services: z
    .object({
      email: z.boolean().default(true),
      filesRead: z.boolean().default(true),
      filesWrite: z.boolean().default(true),
      dbRead: z.boolean().default(false),
      corsProxy: z.boolean().default(false),
    })
    .optional(),
})

export const GET: APIRoute = async () => {
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      services: apiKeys.services,
      isActive: apiKeys.isActive,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt))

  return new Response(JSON.stringify({ data: rows }), {
    headers: { "Content-Type": "application/json" },
  })
}

export const POST: APIRoute = async ({ request }) => {
  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid body"
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const rawKey = `nxs_${randomBytes(24).toString("base64url")}`
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  const keyPrefix = rawKey.slice(0, 8)
  const id = nanoid()

  await db.insert(apiKeys).values({
    id,
    name: body.name,
    keyHash,
    keyPrefix,
    services: body.services ?? {
      email: true,
      filesRead: true,
      filesWrite: true,
      dbRead: false,
      corsProxy: false,
    },
    isActive: true,
  })

  return new Response(
    JSON.stringify({ id, name: body.name, key: rawKey, keyPrefix }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  )
}
