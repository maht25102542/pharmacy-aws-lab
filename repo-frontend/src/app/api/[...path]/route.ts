import { cookies } from "next/headers";
import { authHeaders, backendUrl, TOKEN_COOKIE } from "@/lib/backend";

// BFF proxy: เบราว์เซอร์เรียก /api/... ที่โดเมนเดียวกับหน้าเว็บ แล้วที่นี่ใส่ token จาก cookie ส่งต่อไป Django
// ผลคือ: ไม่ต้องเปิด backend สู่ภายนอก · ไม่มีปัญหา CORS · token ไม่ถูกเปิดเผยแก่ JavaScript
async function proxy(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(req.url);
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  let r: Response;
  try {
    r = await fetch(backendUrl(`/api/${path.join("/")}${url.search}`), {
      method: req.method,
      headers: authHeaders(token, hasBody ? { "Content-Type": req.headers.get("content-type") ?? "application/json" } : {}),
      body: hasBody ? await req.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return Response.json({ detail: "backend unavailable" }, { status: 502 });
  }
  return new Response(r.status === 204 ? null : await r.text(), { status: r.status, headers: { "Content-Type": r.headers.get("content-type") ?? "application/json" } });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
