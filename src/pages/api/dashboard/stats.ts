export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { apiKeys, sentEmails, files } from "@/lib/db/schema"
import { count, eq, sql } from "drizzle-orm"

export const GET: APIRoute = async () => {
  const [[emailRow], [fileRow], [keyRow], tableRow] = await Promise.all([
    db.select({ count: count() }).from(sentEmails),
    db.select({ count: count() }).from(files),
    db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.isActive, true)),
    db.execute(sql`
      SELECT COUNT(*) AS total
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `),
  ])

  return new Response(
    JSON.stringify({
      emailsSent: emailRow?.count ?? 0,
      filesStored: fileRow?.count ?? 0,
      activeKeys: keyRow?.count ?? 0,
      dbTables: Number((tableRow as unknown as { total: string }[])[0]?.total ?? 0),
    }),
    { headers: { "Content-Type": "application/json" } },
  )
}
