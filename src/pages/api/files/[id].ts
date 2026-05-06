export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { validateApiKey, jsonError } from "@/lib/auth"
import { readFileBuffer, deleteFile } from "@/lib/file-storage"
import { eq } from "drizzle-orm"

export const GET: APIRoute = async ({ params, request }) => {
  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, params.id!))
    .limit(1)

  if (!file) return jsonError("File not found", 404)

  if (!file.isPublic) {
    const key = await validateApiKey(request, "filesRead")
    if (!key) return jsonError("Unauthorized or file read service disabled", 403)
  }

  const buffer = await readFileBuffer(file.storedName, file.isPublic)

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.originalName}"`,
      "Content-Length": String(buffer.byteLength),
    },
  })
}

export const DELETE: APIRoute = async ({ params, request }) => {
  const key = await validateApiKey(request, "filesWrite")
  if (!key) return jsonError("Unauthorized or file write service disabled", 403)

  const [file] = await db
    .select()
    .from(files)
    .where(eq(files.id, params.id!))
    .limit(1)

  if (!file) return jsonError("File not found", 404)

  await deleteFile(file.storedName, file.isPublic)
  await db.delete(files).where(eq(files.id, file.id))

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  })
}
