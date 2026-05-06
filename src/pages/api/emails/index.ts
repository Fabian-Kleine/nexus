export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { sentEmails } from "@/lib/db/schema"
import type { SQL } from "drizzle-orm"
import { desc, eq, and } from "drizzle-orm"

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)))
  const status = url.searchParams.get("status") ?? undefined

  const conditions: SQL[] = []
  if (status === "sent" || status === "failed") {
    conditions.push(eq(sentEmails.status, status))
  }

  const rows = await db
    .select()
    .from(sentEmails)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sentEmails.sentAt))
    .limit(limit)
    .offset((page - 1) * limit)

  return new Response(JSON.stringify({ data: rows, page, limit }), {
    headers: { "Content-Type": "application/json" },
  })
}
