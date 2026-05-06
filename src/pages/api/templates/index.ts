export const prerender = false

import type { APIRoute } from "astro"
import { db } from "@/lib/db"
import { emailTemplates } from "@/lib/db/schema"
import { extractVariables } from "@/lib/mailer"
import { nanoid } from "nanoid"
import { z } from "zod"
import { desc } from "drizzle-orm"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  subject: z.string().min(1).max(255),
  htmlContent: z.string().min(1),
})

export const GET: APIRoute = async () => {
  const rows = await db
    .select()
    .from(emailTemplates)
    .orderBy(desc(emailTemplates.updatedAt))

  return new Response(JSON.stringify({ data: rows }), {
    headers: { "Content-Type": "application/json" },
  })
}

export const POST: APIRoute = async ({ request }) => {
  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid body"
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const variables = extractVariables(body.htmlContent + " " + body.subject)
  const id = nanoid()

  const [row] = await db
    .insert(emailTemplates)
    .values({ id, ...body, variables })
    .returning()

  return new Response(JSON.stringify(row), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  })
}
