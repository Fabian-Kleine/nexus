export const prerender = false

import type { APIRoute } from "astro"
import { z } from "zod"
import { db } from "@/lib/db"
import { sentEmails, emailTemplates } from "@/lib/db/schema"
import { transporter, renderTemplate } from "@/lib/mailer"
import { validateApiKey, jsonError } from "@/lib/auth"
import { nanoid } from "nanoid"
import { eq } from "drizzle-orm"

const bodySchema = z
  .object({
    to: z.string().email(),
    subject: z.string().min(1).optional(),
    templateId: z.string().optional(),
    variables: z.record(z.string(), z.string()).optional(),
    bodyHtml: z.string().optional(),
  })
  .refine((d) => d.templateId || (d.subject && d.bodyHtml), {
    message: "Provide either templateId or both subject and bodyHtml",
  })

export const POST: APIRoute = async ({ request }) => {
  const key = await validateApiKey(request, "email")
  if (!key) return jsonError("Unauthorized or email service disabled", 403)

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid request body"
    return jsonError(msg, 400)
  }

  const variables = body.variables ?? {}
  let subject = body.subject ?? ""
  let html = body.bodyHtml ?? ""
  let templateId: string | undefined

  if (body.templateId) {
    const [tmpl] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, body.templateId))
      .limit(1)
    if (!tmpl) return jsonError("Template not found", 404)
    templateId = tmpl.id
    subject = renderTemplate(tmpl.subject, variables)
    html = renderTemplate(tmpl.htmlContent, variables)
  } else {
    subject = renderTemplate(subject, variables)
    html = renderTemplate(html, variables)
  }

  const fromEmail = import.meta.env.MAIL_USER as string
  const id = nanoid()
  let status: "sent" | "failed" = "sent"
  let errorMessage: string | undefined

  try {
    await transporter.sendMail({ from: fromEmail, to: body.to, subject, html })
  } catch (e: unknown) {
    status = "failed"
    errorMessage = e instanceof Error ? e.message : String(e)
  }

  await db.insert(sentEmails).values({
    id,
    toEmail: body.to,
    fromEmail,
    subject,
    templateId: templateId ?? null,
    bodyHtml: html,
    status,
    errorMessage: errorMessage ?? null,
    apiKeyId: key.id,
  })

  if (status === "failed") {
    return new Response(JSON.stringify({ id, status, error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ id, status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}
