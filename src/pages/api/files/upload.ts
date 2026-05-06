export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { validateApiKey, isMasterAuthed, jsonError } from "@/lib/auth"
import { saveFile } from "@/lib/file-storage"
import { nanoid } from "nanoid"

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "text/plain", "text/csv", "text/html",
  "application/json",
  "application/zip",
  "video/mp4", "audio/mpeg",
])

export const POST: APIRoute = async ({ request }) => {
  let apiKeyId: string | null = null
  if (!isMasterAuthed(request)) {
    const key = await validateApiKey(request, "filesWrite")
    if (!key) return jsonError("Unauthorized or file write service disabled", 403)
    apiKeyId = key.id
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError("Expected multipart/form-data", 400)
  }

  const file = formData.get("file")
  if (!(file instanceof File)) return jsonError("No file provided", 400)

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return jsonError(`File type '${file.type}' is not allowed`, 415)
  }

  const isPublic = formData.get("isPublic") === "true"
  const id = nanoid()
  const buffer = Buffer.from(await file.arrayBuffer())
  const storedName = await saveFile(id, buffer, file.name, isPublic)

  await db.insert(files).values({
    id,
    originalName: file.name,
    storedName,
    mimeType: file.type,
    sizeBytes: buffer.byteLength,
    isPublic,
    apiKeyId,
  })

  const url = isPublic ? `/uploads/public/${storedName}` : `/api/files/${id}`

  return new Response(JSON.stringify({ id, url, isPublic }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}
