export const prerender = false

import type { APIRoute } from "astro"
import { jsonError } from "@/lib/auth"
import { createTempConnection, closeTempConnection } from "@/lib/db/temp-connection"

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export const GET: APIRoute = async ({ params, request, url }) => {
  const dbUrl = request.headers.get("x-db-url")
  if (!dbUrl) return jsonError("Missing x-db-url header", 400)

  const table = params.table ?? ""
  if (!SAFE_IDENTIFIER.test(table)) return jsonError("Invalid table name", 400)

  const schema = url.searchParams.get("schema") ?? "public"
  if (!SAFE_IDENTIFIER.test(schema)) return jsonError("Invalid schema name", 400)

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1))
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)))
  const offset = (page - 1) * limit

  let client: ReturnType<typeof createTempConnection> | null = null
  try {
    client = createTempConnection(dbUrl)

    const [countRow] = await client.unsafe(
      `SELECT COUNT(*)::bigint AS total FROM "${schema}"."${table}"`
    ) as { total: string }[]

    const rows = await client.unsafe(
      `SELECT * FROM "${schema}"."${table}" LIMIT ${limit} OFFSET ${offset}`
    )

    return new Response(
      JSON.stringify({ data: rows, total: Number(countRow?.total ?? 0), page, limit }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to query table"
    return jsonError(message, 400)
  } finally {
    if (client) await closeTempConnection(client)
  }
}
