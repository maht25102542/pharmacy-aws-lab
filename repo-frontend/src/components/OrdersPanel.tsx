"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { type DraftLine, draftTotal, type PO, PO_BADGE, PO_LABEL, poActions, remaining, type Suggestion, type Supplier, validateDraft } from "@/lib/purchasing";
import { formatPrice, type Medicine, type Page } from "@/lib/stock";
import { canEditCatalog, type Me } from "@/lib/users";

// ใบสั่งซื้อ: สร้างร่าง (เติมจากยาที่ควรสั่งได้) → สั่งซื้อ → รับของ (เปิดล็อตให้) → รับครบ
export default function OrdersPanel() {
  const [data, setData] = useState<Page<PO> | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<PO | null>(null);
  const load = useCallback(async () => { const p = new URLSearchParams({ page: String(page) }); if (status) p.set("status", status); if (q) p.set("q", q); try { setData(await api<Page<PO>>(`/purchase-orders?${p}`)); setError(""); } catch (e) { setError((e as Error).message); } }, [status, q, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);
  const pages = data ? Math.max(1, Math.ceil(data.count / 10)) : 1;
  return (
    <div className="card flush">
      <div className="toolbar" style={{ padding: "16px 16px 0" }}>
        <input className="searchbox" placeholder="เลขที่ PO" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="ค้นหา PO" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="สถานะ"><option value="">ทุกสถานะ</option>{Object.entries(PO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <span style={{ flex: 1 }} />
        {canEditCatalog(me) && <button className="pri" onClick={() => setCreating(true)}>+ สร้างใบสั่งซื้อ</button>}
      </div>
      {error && <div className="err" role="alert" style={{ padding: "0 16px" }}>{error}</div>}
      <table>
        <thead><tr><th>เลขที่</th><th>ผู้จัดจำหน่าย</th><th>สร้างเมื่อ</th><th>กำหนดรับ</th><th className="num">ยอดรวม</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {data?.results.map((o) => (
            <tr key={o.id}><td><b>{o.po_no}</b></td><td>{o.supplier_name}</td><td className="muted">{new Date(o.created_at).toLocaleDateString("th-TH")}</td><td>{o.expected_date ?? "-"}</td><td className="num">{formatPrice(o.total)}</td>
              <td><span className={`badge ${PO_BADGE[o.status]}`}>{PO_LABEL[o.status]}</span></td><td><button className="sm" onClick={() => setView(o)}>เปิดดู</button></td></tr>
          ))}
          {data && data.results.length === 0 && <tr><td colSpan={7} className="empty">ยังไม่มีใบสั่งซื้อ</td></tr>}
        </tbody>
      </table>
      <div className="pager"><span className="muted">{data ? `${data.count} ใบ · หน้า ${page}/${pages}` : ""}</span><button className="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button><button className="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button></div>
      {creating && <CreateDialog onClose={() => setCreating(false)} onDone={(po) => { setCreating(false); load(); setView(po); }} />}
      {view && <DetailDialog po={view} me={me} onClose={() => setView(null)} onChange={(po) => { setView(po); load(); }} onGone={() => { setView(null); load(); }} />}
    </div>
  );
}

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: (po: PO) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sups, setSups] = useState<Supplier[]>([]); const [sup, setSup] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]); const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [mq, setMq] = useState(""); const [found, setFound] = useState<Medicine[]>([]);
  const [expected, setExpected] = useState(""); const [note, setNote] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { ref.current?.showModal(); api<Page<Supplier>>("/suppliers?active=1").then((d) => setSups(d.results)).catch(() => undefined); api<Suggestion[]>("/reorder-suggestions").then(setSugg).catch(() => undefined); }, []);
  useEffect(() => { if (!mq) { setFound([]); return; } const t = setTimeout(() => api<Page<Medicine>>(`/medicines?q=${encodeURIComponent(mq)}`).then((d) => setFound(d.results)).catch(() => undefined), 250); return () => clearTimeout(t); }, [mq]);
  const has = (id: number) => lines.some((l) => l.medicine === id);
  const add = (l: DraftLine) => { if (!has(l.medicine)) setLines([...lines, l]); };
  const upd = (i: number, k: "qty" | "cost", v: string) => setLines(lines.map((l, x) => (x === i ? { ...l, [k]: v } : l)));
  async function save() {
    const e = validateDraft(sup, lines); if (e) { setErr(e); return; }
    try { onDone(await api<PO>("/purchase-orders", { method: "POST", body: JSON.stringify({ supplier: Number(sup), expected_date: expected || null, note, items: lines.map((l) => ({ medicine: l.medicine, qty: Number(l.qty), unit_cost: l.cost })) }) })); } catch (x) { setErr((x as Error).message); }
  }
  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} style={{ minWidth: "min(760px,94vw)" }}>
      <div className="form">
        <strong>สร้างใบสั่งซื้อ</strong>
        <div className="grid2">
          <label>ผู้จัดจำหน่าย<select value={sup} onChange={(e) => setSup(e.target.value)} aria-label="ผู้จัดจำหน่าย"><option value="">เลือก…</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label>กำหนดรับของ<input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} aria-label="กำหนดรับของ" /></label>
        </div>
        {sugg.length > 0 && <div className="notice">ยาที่ควรสั่ง {sugg.length} รายการ <button className="sm" onClick={() => setLines([...lines, ...sugg.filter((s) => !has(s.medicine)).map((s) => ({ medicine: s.medicine, sku: s.sku, name: s.name, qty: String(s.suggested_qty), cost: s.last_cost }))])}>เติมทั้งหมดลงรายการ</button></div>}
        <label>เพิ่มยา<input value={mq} onChange={(e) => setMq(e.target.value)} placeholder="ค้นหาชื่อหรือรหัสยา" aria-label="ค้นหายาที่จะสั่ง" /></label>
        {found.length > 0 && <ul className="mini">{found.slice(0, 5).map((m) => <li key={m.id}><div className="grow"><b>{m.name}</b><span className="muted">{m.sku} · คงเหลือ {m.stock}</span></div><button className="sm" disabled={has(m.id)} onClick={() => { add({ medicine: m.id, sku: m.sku, name: m.name, qty: "10", cost: (Number(m.price) * 0.7).toFixed(2) }); setMq(""); }}>{has(m.id) ? "เพิ่มแล้ว" : "+ เพิ่ม"}</button></li>)}</ul>}
        <table><thead><tr><th>ยา</th><th>จำนวน</th><th>ต้นทุน/หน่วย</th><th></th></tr></thead><tbody>
          {lines.map((l, i) => <tr key={l.medicine}><td>{l.name}<div className="muted">{l.sku}</div></td><td><input className="qty" value={l.qty} onChange={(e) => upd(i, "qty", e.target.value)} aria-label={`จำนวน ${l.name}`} /></td><td><input className="qty" style={{ width: 90 }} value={l.cost} onChange={(e) => upd(i, "cost", e.target.value)} aria-label={`ต้นทุน ${l.name}`} /></td><td><button className="sm danger" onClick={() => setLines(lines.filter((_, x) => x !== i))} aria-label={`ลบ ${l.name}`}>✕</button></td></tr>)}
          {lines.length === 0 && <tr><td colSpan={4} className="empty">ยังไม่มีรายการ</td></tr>}
        </tbody></table>
        <label>หมายเหตุ<input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></label>
        <div><b>ยอดรวม {formatPrice(draftTotal(lines))}</b></div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar"><button className="pri" onClick={save}>บันทึกเป็นร่าง</button><button onClick={onClose}>ยกเลิก</button></div>
      </div>
    </dialog>
  );
}

function DetailDialog({ po, me, onClose, onChange, onGone }: { po: PO; me: Me | null; onClose: () => void; onChange: (po: PO) => void; onGone: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [recv, setRecv] = useState<Record<number, { qty: string; lot: string; exp: string }>>({}); const [err, setErr] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  const act = poActions(po); const staff = canEditCatalog(me);
  async function call(path: string, body?: unknown): Promise<boolean> { try { setErr(""); onChange(await api<PO>(`/purchase-orders/${po.id}/${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined })); return true; } catch (e) { setErr((e as Error).message); return false; } }
  async function remove() { if (!confirm(`ลบร่าง ${po.po_no} ?`)) return; try { await api(`/purchase-orders/${po.id}`, { method: "DELETE" }); onGone(); } catch (e) { setErr((e as Error).message); } }
  function doReceive() {
    const items = po.items.filter((i) => recv[i.id]?.qty).map((i) => ({ item: i.id, qty: Number(recv[i.id].qty), lot_no: recv[i.id].lot, expiry_date: recv[i.id].exp || null }));
    if (items.length === 0) { setErr("ใส่จำนวนที่รับอย่างน้อย 1 รายการ"); return; }
    if (items.some((x) => !Number.isInteger(x.qty) || x.qty < 1)) { setErr("จำนวนที่รับต้องเป็นเลขจำนวนเต็มมากกว่า 0"); return; }
    call("receive", { items }).then((done) => { if (done) setRecv({}); }); // ล้างช่องที่กรอกเฉพาะเมื่อสำเร็จ (error แล้วไม่ต้องกรอกใหม่)
  }
  const set = (id: number, k: "qty" | "lot" | "exp", v: string) => setRecv({ ...recv, [id]: { ...(recv[id] ?? { qty: "", lot: "", exp: "" }), [k]: v } });
  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} style={{ minWidth: "min(780px,94vw)" }}>
      <div className="form">
        <div className="toolbar" style={{ marginBottom: 0 }}><strong>{po.po_no}</strong><span className={`badge ${PO_BADGE[po.status]}`}>{PO_LABEL[po.status]}</span><span style={{ flex: 1 }} /><span className="muted">{po.supplier_name}</span></div>
        <div className="muted">สร้างโดย {po.created_by_name ?? "-"} · {new Date(po.created_at).toLocaleString("th-TH")}{po.expected_date ? ` · กำหนดรับ ${po.expected_date}` : ""}{po.note ? ` · ${po.note}` : ""}</div>
        <table><thead><tr><th>ยา</th><th className="num">สั่ง</th><th className="num">รับแล้ว</th><th className="num">ต้นทุน</th>{act.receive && <th>รับครั้งนี้ / ล็อต / หมดอายุ</th>}</tr></thead><tbody>
          {po.items.map((i) => <tr key={i.id}><td>{i.name}<div className="muted">{i.sku}</div></td><td className="num">{i.qty_ordered}</td><td className="num">{i.qty_received}</td><td className="num">{formatPrice(i.unit_cost)}</td>
            {act.receive && <td>{remaining(i) > 0 ? <div style={{ display: "flex", gap: 6 }}><input className="qty" value={recv[i.id]?.qty ?? ""} placeholder={`≤${remaining(i)}`} onChange={(e) => set(i.id, "qty", e.target.value)} aria-label={`รับ ${i.name}`} /><input style={{ width: 110 }} value={recv[i.id]?.lot ?? ""} placeholder="เลขล็อต" onChange={(e) => set(i.id, "lot", e.target.value)} aria-label={`ล็อต ${i.name}`} /><input type="date" value={recv[i.id]?.exp ?? ""} onChange={(e) => set(i.id, "exp", e.target.value)} aria-label={`หมดอายุ ${i.name}`} /></div> : <span className="muted">รับครบ</span>}</td>}</tr>)}
        </tbody></table>
        <div><b>ยอดรวม {formatPrice(po.total)}</b></div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="toolbar noprint">
          {act.order && staff && <button className="pri" onClick={() => call("order")}>สั่งซื้อ</button>}
          {act.receive && <button className="pri" onClick={doReceive}>รับของเข้าคลัง</button>}
          {act.cancel && staff && <button className="danger" onClick={() => call("cancel")}>ยกเลิก PO</button>}
          {act.remove && staff && <button className="danger" onClick={remove}>ลบร่าง</button>}
          <span style={{ flex: 1 }} /><button onClick={onClose}>ปิด</button>
        </div>
      </div>
    </dialog>
  );
}
