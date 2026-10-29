"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayName, initials, ROLE_LABEL, type Me } from "@/lib/users";

export default function Topbar({ me }: { me: Me }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <header className="topbar">
      <span className="sp" />
      <Link href="/profile" className="userpill" title="โปรไฟล์ของฉัน">
        <span className="avatar">{initials(me)}</span>
        <span><b>{displayName(me)}</b><small>{ROLE_LABEL[me.role]}</small></span>
      </Link>
      <button className="sm" onClick={logout}>ออกจากระบบ</button>
    </header>
  );
}
