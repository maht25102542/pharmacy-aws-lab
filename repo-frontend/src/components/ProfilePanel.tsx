"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { displayName, initials, passwordProblems, ROLE_HINT, ROLE_LABEL, type Me } from "@/lib/users";

export default function ProfilePanel() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      setMe(await api<Me>("/auth/me", { method: "PATCH", body: JSON.stringify({ first_name: f.get("first_name"), last_name: f.get("last_name"), email: f.get("email") }) }));
      setMsg({ ok: true, text: "บันทึกข้อมูลแล้ว" });
      router.refresh();
    } catch (x) { setMsg({ ok: false, text: (x as Error).message }); }
  }
  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("new_password") !== f.get("confirm")) { setPwMsg("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน"); return; }
    const problems = passwordProblems(String(f.get("new_password")));
    if (problems.length) { setPwMsg(problems.join(" · ")); return; }
    try {
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ old_password: f.get("old_password"), new_password: f.get("new_password") }) });
      await fetch("/api/auth/logout", { method: "POST" }); // backend ยกเลิก token เดิมแล้ว: ล้าง cookie แล้วให้ล็อกอินใหม่
      router.replace("/login");
    } catch (x) { setPwMsg((x as Error).message); }
  }
  if (!me) return <div className="empty">กำลังโหลด…</div>;
  return (
    <>
      <div className="pagehead"><div><h1>โปรไฟล์ของฉัน</h1><p className="sub" style={{ margin: 0 }}>ข้อมูลส่วนตัวและรหัสผ่าน</p></div></div>
      <div className="two">
        <form className="card form" onSubmit={saveProfile}>
          <div className="who" style={{ marginBottom: 6 }}><span className="avatar" style={{ width: 56, height: 56, fontSize: "1.4rem" }}>{initials(me)}</span><div><b style={{ fontSize: "1.1rem" }}>{displayName(me)}</b><small>@{me.username}</small><div><span className={`badge ${me.role}`}>{ROLE_LABEL[me.role]}</span></div></div></div>
          <span className="muted" style={{ fontSize: ".84rem" }}>{ROLE_HINT[me.role]} · บทบาทเปลี่ยนได้โดยผู้ดูแลระบบเท่านั้น</span>
          <div className="grid2"><label>ชื่อ<input name="first_name" defaultValue={me.first_name} /></label><label>นามสกุล<input name="last_name" defaultValue={me.last_name} /></label></div>
          <label>อีเมล<input name="email" type="email" defaultValue={me.email} /></label>
          {msg && <div className={msg.ok ? "ok-text" : "err"} role="status">{msg.text}</div>}
          <div><button className="pri">บันทึก</button></div>
        </form>
        <form className="card form" onSubmit={changePassword}>
          <h2>เปลี่ยนรหัสผ่าน</h2>
          <label>รหัสผ่านเดิม<input name="old_password" type="password" autoComplete="current-password" required /></label>
          <label>รหัสผ่านใหม่<input name="new_password" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /><span className="hint">ยาวอย่างน้อย 10 ตัวอักษร · ไม่ใช่ตัวเลขล้วน · ไม่ใช่รหัสที่เดาง่าย</span></label>
          <label>ยืนยันรหัสผ่านใหม่<input name="confirm" type="password" autoComplete="new-password" required /></label>
          {pwMsg && <div className="err" role="alert">{pwMsg}</div>}
          <div><button className="pri" disabled={!pw}>เปลี่ยนรหัสผ่าน</button> <span className="muted" style={{ fontSize: ".8rem" }}>เปลี่ยนแล้วต้องล็อกอินใหม่</span></div>
        </form>
      </div>
    </>
  );
}
