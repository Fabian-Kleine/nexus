export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { dbConnections } from "@/lib/db/schema"
import { jsonError } from "@/lib/auth"
import { nanoid } from "nanoid"
import { desc } from "drizzle-orm"

export const GET: APIRoute = async () => {
  const connections = await db
    .select()
    .from(dbConnections)
    .orderBy(desc(dbConnections.createdAt))

  return new Response(JSON.stringify({ connections }), {
    headers: { "Content-Type": "application/json" },
  })
}

export const POST: APIRoute = async ({ request }) => {
  let body: { name?: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON", 400)
  }

  const name = (body.name ?? "").trim()
  const url = (body.url ?? "").trim()

  if (!name) return jsonError("name is required", 400)
  if (!url) return jsonError("url is required", 400)
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
    return jsonError("url must be a PostgreSQL connection string", 400)
  }

  const [connection] = await db
    .insert(dbConnections)
    .values({ id: nanoid(), name, url })
    .returning()

  return new Response(JSON.stringify({ connection }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}
