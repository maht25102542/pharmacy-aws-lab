import { cookies } from "next/headers";
import { authHeaders, backendUrl, TOKEN_COOKIE } from "@/lib/backend";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  if (token) await fetch(backendUrl("/api/auth/logout"), { method: "POST", headers: authHeaders(token), signal: AbortSignal.timeout(5_000) }).catch(() => undefined);
  jar.delete(TOKEN_COOKIE);
  return new Response(null, { status: 204 });
}
