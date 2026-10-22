"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <nav className="nav">
      <span className="brand">💊 Pharmacy</span>
      <Link href="/" className={path === "/" ? "on" : ""}>สต็อกยา</Link>
      <Link href="/movements" className={path === "/movements" ? "on" : ""}>ประวัติการเคลื่อนไหว</Link>
      <span className="sp" />
      <button className="sm" onClick={logout}>ออกจากระบบ</button>
    </nav>
  );
}
