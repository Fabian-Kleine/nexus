export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { apiKeys } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z
  .object({
    isActive: z.boolean().optional(),
    services: z
      .object({
        email: z.boolean(),
        filesRead: z.boolean(),
        filesWrite: z.boolean(),
        dbRead: z.boolean(),
      })
      .optional(),
    name: z.string().min(1).max(100).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" })

export const PATCH: APIRoute = async ({ params, request }) => {
  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid body"
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const updates: Record<string, unknown> = {}
  if (body.isActive !== undefined) updates.isActive = body.isActive
  if (body.services !== undefined) updates.services = body.services
  if (body.name !== undefined) updates.name = body.name

  const [updated] = await db
    .update(apiKeys)
    .set(updates)
    .where(eq(apiKeys.id, params.id!))
    .returning()

  if (!updated) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
}

export const DELETE: APIRoute = async ({ params }) => {
  const [deleted] = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, params.id!))
    .returning({ id: apiKeys.id })

  if (!deleted) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
