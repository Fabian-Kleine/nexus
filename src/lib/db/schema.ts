import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core"

export type ApiKeyServices = {
  email: boolean
  filesRead: boolean
  filesWrite: boolean
  dbRead: boolean
}

export const apiKeys = pgTable("api_keys", {
  id: varchar("id", { length: 21 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 8 }).notNull(),
  services: jsonb("services").$type<ApiKeyServices>().notNull().default({
    email: true,
    filesRead: true,
    filesWrite: true,
    dbRead: false,
  }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
})

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id", { length: 21 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  htmlContent: text("html_content").notNull(),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sentEmails = pgTable("sent_emails", {
  id: varchar("id", { length: 21 }).primaryKey(),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  fromEmail: varchar("from_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  templateId: varchar("template_id", { length: 21 }),
  bodyHtml: text("body_html").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  apiKeyId: varchar("api_key_id", { length: 21 }).notNull(),
})

export const files = pgTable("files", {
  id: varchar("id", { length: 21 }).primaryKey(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  storedName: varchar("stored_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  apiKeyId: varchar("api_key_id", { length: 21 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const dbConnections = pgTable("db_connections", {
  id: varchar("id", { length: 21 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
