export const prerender = false

import type { APIRoute } from "astro"
import { validateApiKey, isMasterAuthed, jsonError } from "@/lib/auth"

const BLOCKED_HOSTNAMES = /^(localhost|.*\.local)$/i

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
]

function isBlockedTarget(url: URL): boolean {
  const host = url.hostname

  if (BLOCKED_HOSTNAMES.test(host)) return true

  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(host)) return true
  }

  return false
}

// Headers that should not be forwarded to the upstream
const HOP_BY_HOP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "x-api-key",
])

export const GET: APIRoute = async ({ request }) => {
  return handleProxy(request)
}

export const POST: APIRoute = async ({ request }) => {
  return handleProxy(request)
}

export const PUT: APIRoute = async ({ request }) => {
  return handleProxy(request)
}

export const PATCH: APIRoute = async ({ request }) => {
  return handleProxy(request)
}

export const DELETE: APIRoute = async ({ request }) => {
  return handleProxy(request)
}

export const OPTIONS: APIRoute = async ({ request }) => {
  const origin = request.headers.get("origin") ?? "*"
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  })
}

async function handleProxy(request: Request): Promise<Response> {
  if (!isMasterAuthed(request)) {
    const key = await validateApiKey(request, "corsProxy")
    if (!key) return jsonError("Unauthorized or CORS proxy service disabled", 403)
  }

  const rawUrl = new URL(request.url).searchParams.get("url")
  if (!rawUrl) return jsonError("Missing 'url' query parameter", 400)

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return jsonError("Invalid URL", 400)
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return jsonError("Only http and https protocols are allowed", 400)
  }

  if (isBlockedTarget(targetUrl)) {
    return jsonError("Target URL is not allowed", 403)
  }

  // Forward safe request headers
  const forwardHeaders = new Headers()
  for (const [name, value] of request.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      forwardHeaders.set(name, value)
    }
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      // @ts-expect-error -- node fetch supports duplex
      duplex: "half",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream request failed"
    return jsonError(message, 502)
  }

  // Build response headers, adding CORS headers
  const responseHeaders = new Headers()
  for (const [name, value] of upstreamResponse.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value)
    }
  }

  const origin = request.headers.get("origin") ?? "*"
  responseHeaders.set("Access-Control-Allow-Origin", origin)
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, x-api-key")

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  })
}
