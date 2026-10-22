// ให้ probe ของ Kubernetes / ALB เรียก: ไม่ต้องล็อกอิน ไม่แตะ backend (backend ล่มต้องไม่ทำให้ pod ฝั่งนี้ถูกรีสตาร์ท)
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", version: process.env.APP_VERSION ?? "dev" });
}
