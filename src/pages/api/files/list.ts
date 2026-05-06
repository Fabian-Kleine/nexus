export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

export const GET: APIRoute = async () => {
  const rows = await db.select().from(files).orderBy(desc(files.createdAt))

  return new Response(JSON.stringify({ data: rows }), {
    headers: { "Content-Type": "application/json" },
  })
}
