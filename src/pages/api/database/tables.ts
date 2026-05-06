export const prerender = false

import type { APIRoute } from "astro"
import { jsonError } from "@/lib/auth"
import { createTempConnection, closeTempConnection } from "@/lib/db/temp-connection"

export const GET: APIRoute = async ({ request }) => {
  const dbUrl = request.headers.get("x-db-url")
  if (!dbUrl) return jsonError("Missing x-db-url header", 400)

  let client: ReturnType<typeof createTempConnection> | null = null
  try {
    client = createTempConnection(dbUrl)

    const rows = await client`
      SELECT
        t.table_schema AS schema,
        t.table_name AS name,
        GREATEST(0, COALESCE(c.reltuples::bigint, 0)) AS row_estimate
      FROM information_schema.tables t
      LEFT JOIN pg_namespace n ON n.nspname = t.table_schema
      LEFT JOIN pg_class c ON c.relname = t.table_name AND c.relnamespace = n.oid AND c.relkind = 'r'
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY t.table_schema, t.table_name
    `

    return new Response(JSON.stringify({ tables: rows }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to query database"
    return jsonError(message, 400)
  } finally {
    if (client) await closeTempConnection(client)
  }
}
