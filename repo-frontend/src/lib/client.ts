// เรียก API จากเบราว์เซอร์ (ผ่าน proxy /api ของ Next) — หมดอายุ/ไม่ได้ล็อกอิน (401) = กลับไปหน้า login
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`/api${path}`, { ...init, headers: { "Content-Type": "application/json", ...init.headers }, cache: "no-store" });
  if (r.status === 401) {
    window.location.href = "/login";
    throw new Error("session expired");
  }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(errorText(data) || `HTTP ${r.status}`);
  return data as T;
}

// Django REST ส่งข้อผิดพลาดได้ 2 แบบ: {"detail": "..."} หรือ {"ชื่อช่อง": ["ข้อความ"]}
export function errorText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  return Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ");
}
