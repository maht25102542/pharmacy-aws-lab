"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { canManageUsers, displayName, formatDateTime, initials, passwordProblems, ROLE_HINT, ROLE_LABEL, type Me, type Role, type User } from "@/lib/users";

const ROLES: Role[] = ["admin", "pharmacist", "clerk"];

export default function UsersPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<User[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [edit, setEdit] = useState<User | "new" | null>(null);

  const load = useCallback(async () => {
    try { setUsers(await api<User[]>(`/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [q]);
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);
  useEffect(() => { if (me && canManageUsers(me)) { const t = setTimeout(load, 250); return () => clearTimeout(t); } }, [me, load]);

  async function remove(u: User) {
    if (!confirm(`ลบผู้ใช้ ${u.username} ? (ประวัติสต็อกที่เขาทำไว้ยังอยู่ แต่จะไม่มีชื่อผู้ทำ)`)) return;
    try { await api(`/users/${u.id}`, { method: "DELETE" }); await load(); } catch (e) { setError((e as Error).message); }
  }
  async function toggle(u: User) {
    try { await api(`/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) }); await load(); } catch (e) { setError((e as Error).message); }
  }

  if (me && !canManageUsers(me)) return <div className="notice bad">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</div>;
  return (
    <>
      <div className="pagehead">
        <div><h1>ผู้ใช้งาน</h1><p className="sub" style={{ margin: 0 }}>สร้างบัญชีให้เภสัชกรและพนักงาน กำหนดบทบาท เปิด/ปิดการใช้งาน</p></div>
        <span className="sp" />
        <button className="pri" onClick={() => setEdit("new")}>+ เพิ่มผู้ใช้</button>
      </div>
      <div className="card flush">
        <div className="toolbar" style={{ padding: "16px 16px 0" }}>
          <input className="searchbox" placeholder="ค้นหาชื่อผู้ใช้" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาผู้ใช้" />
          <span className="muted">{users ? `${users.length} บัญชี` : ""}</span>
        </div>
        {error && <div className="err" role="alert" style={{ padding: "0 16px" }}>{error}</div>}
        <table>
          <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id}>
                <td><div className="who"><span className="avatar">{initials(u)}</span><div><b>{displayName(u)}{me?.id === u.id && <span className="muted"> (คุณ)</span>}</b><small>@{u.username}{u.email ? ` · ${u.email}` : ""}</small></div></div></td>
                <td><span className={`badge ${u.role}`}>{ROLE_LABEL[u.role]}</span></td>
                <td><span className={`badge ${u.is_active ? "ok" : "off"}`}>{u.is_active ? "ใช้งานอยู่" : "ปิดการใช้งาน"}</span></td>
                <td className="muted">{formatDateTime(u.last_login)}</td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <button className="sm" onClick={() => setEdit(u)}>แก้ไข</button>{" "}
                  <button className="sm" disabled={me?.id === u.id} onClick={() => toggle(u)}>{u.is_active ? "ปิดบัญชี" : "เปิดบัญชี"}</button>{" "}
                  <button className="sm danger" disabled={me?.id === u.id} onClick={() => remove(u)}>ลบ</button>
                </td>
              </tr>
            ))}
            {users && users.length === 0 && <tr><td colSpan={5} className="empty">ไม่พบผู้ใช้</td></tr>}
            {!users && !error && <tr><td colSpan={5} className="empty">กำลังโหลด…</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <UserDialog user={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    </>
  );
}

function UserDialog({ user, onClose, onDone }: { user: User | null; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const [err, setErr] = useState("");
  const [pw, setPw] = useState("");
  const [role, setRole] = useState<Role>(user?.role ?? "clerk");
  const problems = pw ? passwordProblems(pw) : [];

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { first_name: f.get("first_name"), last_name: f.get("last_name"), email: f.get("email"), role };
    if (!user) body.username = f.get("username");
    if (pw) body.password = pw;
    if (!user && !pw) { setErr("ต้องตั้งรหัสผ่านให้ผู้ใช้ใหม่"); return; }
    if (problems.length) { setErr(`รหัสผ่าน: ${problems.join(", ")}`); return; }
    try { await api(user ? `/users/${user.id}` : "/users", { method: user ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <strong>{user ? `แก้ไขผู้ใช้ @${user.username}` : "เพิ่มผู้ใช้ใหม่"}</strong>
        {!user && <label>ชื่อผู้ใช้ (ใช้ล็อกอิน)<input name="username" maxLength={150} required autoFocus autoComplete="off" /></label>}
        <div className="grid2">
          <label>ชื่อ<input name="first_name" defaultValue={user?.first_name} maxLength={150} /></label>
          <label>นามสกุล<input name="last_name" defaultValue={user?.last_name} maxLength={150} /></label>
        </div>
        <label>อีเมล<input name="email" type="email" defaultValue={user?.email} /></label>
        <label>บทบาท
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          <span className="hint">{ROLE_HINT[role]}</span>
        </label>
        <label>{user ? "ตั้งรหัสผ่านใหม่ (เว้นว่าง = ไม่เปลี่ยน)" : "รหัสผ่าน"}
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <span className="hint">{problems.length ? <span className="err">{problems.join(" · ")}</span> : "ยาวอย่างน้อย 10 ตัวอักษร และไม่ใช่รหัสที่เดาง่าย · เปลี่ยนรหัสแล้วผู้ใช้ต้องล็อกอินใหม่"}</span>
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar"><button className="pri">บันทึก</button><button type="button" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </dialog>
  );
}
