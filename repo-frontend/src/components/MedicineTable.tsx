"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatPrice, type Medicine, type Page, parseQty, stockStatus } from "@/lib/stock";
import { canEditCatalog, type Me } from "@/lib/users";

type Category = { id: number; name: string };
const LABEL = { ok: "ปกติ", low: "ใกล้หมด", out: "หมด" } as const;
const REASONS = { receive: "รับเข้า", dispense: "จ่ายออก", adjust: "ปรับยอด", expired: "หมดอายุ/ทิ้ง" } as const;

export default function MedicineTable() {
  const [rows, setRows] = useState<Page<Medicine> | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [adjusting, setAdjusting] = useState<{ med: Medicine; sign: 1 | -1 } | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page) });
    if (q) p.set("q", q);
    if (cat) p.set("category", cat);
    if (low) p.set("low_stock", "1");
    try { setRows(await api<Page<Medicine>>(`/medicines?${p}`)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [q, cat, low, page]);

  // พิมพ์ค้นหาแล้วรอ 300ms ค่อยเรียก API (ไม่ยิงทุกตัวอักษร)
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<Category[]>("/categories").then(setCats).catch(() => undefined); api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);

  async function remove(m: Medicine) {
    if (!confirm(`ลบ ${m.name} ? (ประวัติการเคลื่อนไหวของยานี้จะถูกลบด้วย)`)) return;
    try { await api(`/medicines/${m.id}`, { method: "DELETE" }); await load(); } catch (e) { setError((e as Error).message); }
  }

  const pages = rows ? Math.max(1, Math.ceil(rows.count / 10)) : 1;
  return (
    <div className="card flush">
      <div className="toolbar" style={{ padding: "16px 16px 0" }}>
        <input className="searchbox" placeholder="ค้นหาชื่อหรือรหัสยา" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="ค้นหา" />
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} aria-label="หมวดหมู่">
          <option value="">ทุกหมวดหมู่</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label><input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} /> เฉพาะใกล้หมด</label>
        <span style={{ flex: 1 }} />
        {canEditCatalog(me) && <button className="pri" onClick={() => setAdding(true)}>+ เพิ่มยา</button>}
      </div>
      {error && <div className="err" role="alert" style={{ padding: "0 16px" }}>{error}</div>}
      <table>
        <thead><tr><th>รหัส</th><th>ชื่อยา</th><th>หมวดหมู่</th><th className="num">ราคา</th><th className="num">คงเหลือ</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {rows?.results.map((m) => {
            const st = stockStatus(m);
            return (
              <tr key={m.id}>
                <td>{m.sku}</td><td>{m.name}</td><td className="muted">{m.category_name ?? "-"}</td>
                <td className="num">{formatPrice(m.price)}</td>
                <td className="num">{m.stock} <span className="muted">{m.unit}</span></td>
                <td><span className={`badge ${st}`}>{LABEL[st]}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="sm" onClick={() => setAdjusting({ med: m, sign: 1 })}>+ รับเข้า</button>{" "}
                  <button className="sm" onClick={() => setAdjusting({ med: m, sign: -1 })}>− จ่ายออก</button>
                  {canEditCatalog(me) && <> <button className="sm danger" onClick={() => remove(m)}>ลบ</button></>}
                </td>
              </tr>
            );
          })}
          {rows && rows.results.length === 0 && <tr><td colSpan={7} className="empty">ไม่พบรายการ</td></tr>}
          {!rows && !error && <tr><td colSpan={7} className="empty">กำลังโหลด…</td></tr>}
        </tbody>
      </table>
      <div className="pager">
        <span className="muted">{rows ? `${rows.count} รายการ · หน้า ${page}/${pages}` : ""}</span>
        <button className="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button>
        <button className="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button>
      </div>
      {adjusting && <AdjustDialog {...adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); load(); }} />}
      {adding && <AddDialog cats={cats} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return { ref, onCancel: onClose };
}

function AdjustDialog({ med, sign, onClose, onDone }: { med: Medicine; sign: 1 | -1; onClose: () => void; onDone: () => void }) {
  const m = useModal(onClose);
  const [err, setErr] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const delta = parseQty(String(f.get("qty")), sign);
    if (delta === null) { setErr("จำนวนต้องเป็นเลขจำนวนเต็มมากกว่า 0"); return; }
    try { await api(`/medicines/${med.id}/adjust`, { method: "POST", body: JSON.stringify({ delta, reason: f.get("reason"), note: f.get("note") }) }); onDone(); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <dialog ref={m.ref} onCancel={m.onCancel} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <strong>{sign > 0 ? "รับเข้า" : "จ่ายออก"}: {med.name}</strong>
        <span className="muted">คงเหลือตอนนี้ {med.stock} {med.unit}</span>
        <label>จำนวน<input name="qty" inputMode="numeric" autoFocus required /></label>
        <label>เหตุผล<select name="reason" defaultValue={sign > 0 ? "receive" : "dispense"}>{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>หมายเหตุ<input name="note" maxLength={200} placeholder="เช่น เลขใบสั่งซื้อ" /></label>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar"><button className="pri">บันทึก</button><button type="button" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </dialog>
  );
}

function AddDialog({ cats, onClose, onDone }: { cats: Category[]; onClose: () => void; onDone: () => void }) {
  const m = useModal(onClose);
  const [err, setErr] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = { sku: f.get("sku"), name: f.get("name"), category: f.get("category") || null, unit: f.get("unit"), price: f.get("price"), reorder_level: Number(f.get("reorder_level")) };
    try { await api("/medicines", { method: "POST", body: JSON.stringify(body) }); onDone(); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <dialog ref={m.ref} onCancel={m.onCancel} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <strong>เพิ่มยาใหม่</strong>
        <div className="grid2">
          <label>รหัส (SKU)<input name="sku" maxLength={32} required autoFocus /></label>
          <label>ชื่อยา<input name="name" maxLength={200} required /></label>
          <label>หมวดหมู่<select name="category" defaultValue=""><option value="">-</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>หน่วย<input name="unit" defaultValue="box" maxLength={20} required /></label>
          <label>ราคา (บาท)<input name="price" inputMode="decimal" defaultValue="0" required /></label>
          <label>จุดสั่งซื้อ (ต่ำกว่านี้ = ใกล้หมด)<input name="reorder_level" inputMode="numeric" defaultValue="10" required /></label>
        </div>
        <span className="muted">จำนวนเริ่มต้น 0: กด &quot;รับเข้า&quot; หลังเพิ่มยาเพื่อให้มีประวัติ</span>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar"><button className="pri">เพิ่ม</button><button type="button" onClick={onClose}>ยกเลิก</button></div>
      </form>
    </dialog>
  );
}
