import nodemailer from "nodemailer"
import {
  extractTemplateVariables,
  renderTemplateVariables,
} from "@/lib/template-variables"

export const transporter = nodemailer.createTransport({
  host: import.meta.env.MAIL_HOST as string,
  port: Number(import.meta.env.MAIL_PORT ?? 465),
  secure: Number(import.meta.env.MAIL_PORT ?? 465) === 465,
  auth: {
    user: import.meta.env.MAIL_USER as string,
    pass: import.meta.env.MAIL_PASS as string,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export function renderTemplate(
  html: string,
  variables: Record<string, string>,
): string {
  return renderTemplateVariables(html, variables)
}

export function extractVariables(html: string): string[] {
  return extractTemplateVariables(html)
}
