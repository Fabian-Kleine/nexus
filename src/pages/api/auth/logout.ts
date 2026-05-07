export const prerender = false

import type { APIRoute } from "astro"
import { MASTER_AUTH_COOKIE } from "@/lib/master-auth"

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(MASTER_AUTH_COOKIE, { path: "/" })
  return redirect("/master-login")
}
