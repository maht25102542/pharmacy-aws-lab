import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { serverGet } from "@/lib/server";
import type { Me } from "@/lib/users";

// อ่านค่า APP_VERSION ตอนรัน (image ตัวเดียวกันใช้ได้ทุก environment)
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await serverGet<Me>("/api/auth/me");
  if (!me) redirect("/login");
  const version = process.env.APP_VERSION ?? "dev";
  return (
    <div className="shell">
      <Sidebar me={me} version={version} />
      <div style={{ minWidth: 0 }}>
        <Topbar me={me} />
        <main className="content">{children}</main>
        <footer>Pharmacy Stock · เวอร์ชัน {version}</footer>
      </div>
    </div>
  );
}
