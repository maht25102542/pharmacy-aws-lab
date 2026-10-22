import { cookies } from "next/headers";
import { authHeaders, backendUrl, cookieOptions, TOKEN_COOKIE } from "@/lib/backend";

// ล็อกอิน: ส่งต่อให้ Django แล้วเก็บ token ลง cookie (httpOnly) ฝั่ง server เบราว์เซอร์ไม่เห็นตัว token
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ detail: "invalid JSON" }, { status: 400 }); }
  let r: Response;
  try {
    r = await fetch(backendUrl("/api/auth/login"), { method: "POST", headers: authHeaders(undefined, { "Content-Type": "application/json" }), body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  } catch {
    return Response.json({ detail: "backend unavailable" }, { status: 502 });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return Response.json({ detail: data.detail ?? "login failed" }, { status: r.status });
  (await cookies()).set(TOKEN_COOKIE, data.token, cookieOptions());
  return Response.json({ user: data.user });
}
