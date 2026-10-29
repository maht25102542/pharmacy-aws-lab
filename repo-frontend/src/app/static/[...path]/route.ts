import { backendUrl } from "@/lib/backend";

// หน้า Swagger UI (/api/docs ของ backend) โหลด JS/CSS จาก /static/drf_spectacular_sidecar/... ที่โดเมนเดียวกับหน้าเว็บ
// จึงส่งต่อเฉพาะโฟลเดอร์นี้ไป backend (ไม่เปิด /static ของ Django admin และไม่รับพาธอื่น)
const ALLOWED = "drf_spectacular_sidecar/";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rel = path.join("/");
  if (!rel.startsWith(ALLOWED) || rel.includes("..")) return new Response("not found", { status: 404 });
  try {
    const r = await fetch(backendUrl(`/static/${rel}`), { signal: AbortSignal.timeout(10_000) });
    return new Response(r.status === 204 ? null : await r.arrayBuffer(), { status: r.status, headers: { "Content-Type": r.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new Response("backend unavailable", { status: 502 });
  }
}
