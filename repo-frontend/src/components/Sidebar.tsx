"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "@/components/Icons";
import { canManageUsers, type Me } from "@/lib/users";

const LINKS = [
  { href: "/", label: "ภาพรวม", icon: "home" },
  { href: "/medicines", label: "สต็อกยา", icon: "pill" },
  { href: "/movements", label: "ประวัติสต็อก", icon: "history" },
];

export default function Sidebar({ me, version }: { me: Me; version: string }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <aside className="side">
      <div className="brandbox"><Logo /><div>Pharmacy<small>ระบบสต็อกร้านยา</small></div></div>
      {LINKS.map((l) => <Link key={l.href} href={l.href} className={`navlink ${on(l.href) ? "on" : ""}`}><Icon name={l.icon} />{l.label}</Link>)}
      {canManageUsers(me) && (<><div className="navgroup">ผู้ดูแลระบบ</div><Link href="/users" className={`navlink ${on("/users") ? "on" : ""}`}><Icon name="users" />ผู้ใช้งาน</Link></>)}
      <div className="navgroup">นักพัฒนา</div>
      <a className="navlink" href="/api/docs" target="_blank" rel="noreferrer"><Icon name="api" />เอกสาร API (Swagger)</a>
      <div className="sidefoot">เวอร์ชัน {version}</div>
    </aside>
  );
}
