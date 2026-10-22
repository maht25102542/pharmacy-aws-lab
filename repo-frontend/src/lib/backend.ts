// ตัวช่วยฝั่ง server: คุยกับ Django backend (BACKEND_URL มาจาก env ของ container: ใน Kubernetes คือ Service ชื่อ backend)
export const TOKEN_COOKIE = "pharmacy_token";

export function backendUrl(path: string): string {
  const base = (process.env.BACKEND_URL ?? "http://localhost:8000").replace(/\/+$/, "");
  return `${base}${path}`;
}

export function authHeaders(token: string | undefined, extra: Record<string, string> = {}): Record<string, string> {
  return token ? { ...extra, Authorization: `Token ${token}` } : extra;
}

// httpOnly: JavaScript ในเบราว์เซอร์อ่าน token ไม่ได้ (XSS ขโมยไม่ได้)
// secure เปิดด้วย COOKIE_SECURE=1 เมื่อมี HTTPS หน้า ALB (ใน lab เป็น http จึงปิดไว้)
export function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, path: "/", secure: process.env.COOKIE_SECURE === "1", maxAge: 60 * 60 * 8 };
}
