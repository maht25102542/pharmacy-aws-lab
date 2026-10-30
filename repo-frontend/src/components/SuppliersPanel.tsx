"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Supplier } from "@/lib/purchasing";
import type { Page } from "@/lib/stock";
import { canEditCatalog, type Me } from "@/lib/users";

// ผู้จัดจำหน่าย: ค้นหา เพิ่ม/แก้ไข ปิด-เปิดการใช้งาน ลบ (ลบไม่ได้ถ้ามีประวัติสั่งซื้อ) · แก้ได้เฉพาะเภสัชกร/ผู้ดูแล
export default function SuppliersPanel() {
  const [data, setData] = useState<Page<Supplier> | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState(""); const [page, setPage] = useState(1); const [error, setError] = useState("");
  const [edit, setEdit] = useState<Supplier | "new" | null>(null);
  const load = useCallback(async () => { try { setData(await api<Page<Supplier>>(`/suppliers?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`)); setError(""); } catch (e) { setError((e as Error).message); } }, [q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);
  const can = canEditCatalog(me);

  async function toggle(s: Supplier) { try { await api(`/suppliers/${s.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !s.is_active }) }); load(); } catch (e) { setError((e as Error).message); } }
  async function remove(s: Supplier) { if (!confirm(`ลบผู้จัดจำหน่าย ${s.name} ?`)) return; try { await api(`/suppliers/${s.id}`, { method: "DELETE" }); load(); } catch (e) { setError((e as Error).message); } }

  const pages = data ? Math.max(1, Math.ceil(data.count / 10)) : 1;
  return (
    <div className="card flush">
      <div className="toolbar" style={{ padding: "16px 16px 0" }}>
        <input className="searchbox" placeholder="ค้นหาชื่อหรือผู้ติดต่อ" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="ค้นหาผู้จัดจำหน่าย" />
        <span style={{ flex: 1 }} />
        {can && <button className="pri" onClick={() => setEdit("new")}>+ เพิ่มผู้จัดจำหน่าย</button>}
      </div>
      {error && <div className="err" role="alert" style={{ padding: "0 16px" }}>{error}</div>}
      <table>
        <thead><tr><th>ชื่อ</th><th>ผู้ติดต่อ</th><th>โทร</th><th className="num">PO ค้างอยู่</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {data?.results.map((s) => (
            <tr key={s.id}>
              <td><b>{s.name}</b><div className="muted">{s.address}</div></td><td>{s.contact_name || "-"}</td><td>{s.phone || "-"}</td><td className="num">{s.open_orders}</td>
              <td><span className={`badge ${s.is_active ? "ok" : "off"}`}>{s.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></td>
              <td style={{ whiteSpace: "nowrap" }}>{can && <><button className="sm" onClick={() => setEdit(s)}>แก้ไข</button> <button className="sm" onClick={() => toggle(s)}>{s.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button> <button className="sm danger" onClick={() => remove(s)}>ลบ</button></>}</td>
            </tr>
          ))}
          {data && data.results.length === 0 && <tr><td colSpan={6} className="empty">ไม่พบผู้จัดจำหน่าย</td></tr>}
        </tbody>
      </table>
      <div className="pager"><span className="muted">{data ? `${data.count} ราย · หน้า ${page}/${pages}` : ""}</span><button className="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button><button className="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button></div>
      {edit && <SupplierDialog s={edit === "new" ? null : edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function SupplierDialog({ s, onClose, onDone }: { s: Supplier | null; onClose: () => void; onDone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [err, setErr] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = { name: f.get("name"), contact_name: f.get("contact_name"), phone: f.get("phone"), email: f.get("email"), address: f.get("address") };
    try { await api(s ? `/suppliers/${s.id}` : "/suppliers", { method: s ? "PATCH" : "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <strong>{s ? `แก้ไข ${s.name}` : "เพิ่มผู้จัดจำหน่าย"}</strong>
        <label>ชื่อบริษัท/ร้าน<input name="name" defaultValue={s?.name} maxLength={150} required autoFocus /></label>
        <div className="grid2"><label>ผู้ติดต่อ<input name="contact_name" defaultValue={s?.contact_name} maxLength={120} /></label><label>โทร<input name="phone" defaultValue={s?.phone} maxLength={40} /></label><label>อีเมล<input name="email" defaultValue={s?.email} maxLength={254} /></label><label>ที่อยู่<input name="address" defaultValue={s?.address} maxLength={300} /></label></div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar"><button className="pri">บันทึก</button><button type="button" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </dialog>
  );
}
