export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { emailTemplates } from "@/lib/db/schema"
import { extractVariables } from "@/lib/mailer"
import { eq } from "drizzle-orm"
import { z } from "zod"

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(255).optional(),
  htmlContent: z.string().min(1).optional(),
})

export const GET: APIRoute = async ({ params }) => {
  const [row] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.id, params.id!))
    .limit(1)

  if (!row) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify(row), {
    headers: { "Content-Type": "application/json" },
  })
}

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

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name) updates.name = body.name
  if (body.subject) updates.subject = body.subject
  if (body.htmlContent) updates.htmlContent = body.htmlContent

  if (body.htmlContent || body.subject) {
    const [current] = await db
      .select({
        htmlContent: emailTemplates.htmlContent,
        subject: emailTemplates.subject,
      })
      .from(emailTemplates)
      .where(eq(emailTemplates.id, params.id!))
      .limit(1)

    if (!current) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const mergedHtml = body.htmlContent ?? current.htmlContent
    const mergedSubject = body.subject ?? current.subject
    updates.variables = extractVariables(`${mergedHtml} ${mergedSubject}`)
  }

  const [updated] = await db
    .update(emailTemplates)
    .set(updates)
    .where(eq(emailTemplates.id, params.id!))
    .returning()

  if (!updated) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify(updated), {
    headers: { "Content-Type": "application/json" },
  })
}

export const DELETE: APIRoute = async ({ params }) => {
  const [deleted] = await db
    .delete(emailTemplates)
    .where(eq(emailTemplates.id, params.id!))
    .returning({ id: emailTemplates.id })

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
