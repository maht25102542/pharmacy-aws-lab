// ประกอบ URL หน้า login จาก header ที่ผู้ใช้ส่งมาจริง (Host ของ ALB) — ใน container Next เห็นตัวเองเป็น 0.0.0.0:3000
// จึงห้ามใช้ req.url ตรงๆ ไม่งั้นผู้ใช้ถูกเด้งไปที่ http://0.0.0.0:3000/login
export function loginUrl(h: { get(name: string): string | null }): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/login`;
}
