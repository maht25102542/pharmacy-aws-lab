import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE } from "@/lib/backend";
import { loginUrl } from "@/lib/loginUrl";

// ด่านหน้า: ไม่มี cookie ล็อกอิน = ส่งไปหน้า /login (เช็กจริงว่า token ใช้ได้ไหมอยู่ที่ backend)
export function middleware(req: NextRequest) {
  if (!req.cookies.get(TOKEN_COOKIE)) return NextResponse.redirect(loginUrl(req.headers));
  return NextResponse.next();
}

// ยกเว้น: หน้า login, health check ของ Kubernetes, API (backend ตอบ 401 เอง), ไฟล์ของ Next
export const config = { matcher: ["/((?!login|healthz|api|_next/static|_next/image|favicon.ico).*)"] };
