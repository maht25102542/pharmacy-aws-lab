import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Pharmacy Stock", description: "ระบบจัดการสต็อกยา" };
// อ่าน APP_VERSION ตอนรัน (ไม่ใช่ตอน build): image ตัวเดียวกันใช้ได้ทุก environment
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
