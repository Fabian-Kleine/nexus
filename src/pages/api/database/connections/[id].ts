export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { dbConnections } from "@/lib/db/schema"
import { jsonError } from "@/lib/auth"
import { eq } from "drizzle-orm"

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params
  if (!id) return jsonError("Missing id", 400)

  const deleted = await db
    .delete(dbConnections)
    .where(eq(dbConnections.id, id))
    .returning()

  if (deleted.length === 0) return jsonError("Connection not found", 404)

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
