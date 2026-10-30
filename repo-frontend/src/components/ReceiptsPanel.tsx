"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Receipt from "@/components/Receipt";
import { api } from "@/lib/client";
import { PAYMENT_LABEL, type Sale } from "@/lib/sales";
import { formatPrice, type Page } from "@/lib/stock";
import type { Me } from "@/lib/users";

// ประวัติใบเสร็จ: ค้นหา/กรองวันที่/สถานะ · ดูใบเสร็จ · ยกเลิกบิล (เภสัชกร/ผู้ดูแล)
export default function ReceiptsPanel() {
  const [data, setData] = useState<Page<Sale> | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [view, setView] = useState<Sale | null>(null);
  const [reason, setReason] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    const p = new URLSearchParams({ page: String(page) });
    if (q) p.set("q", q); if (from) p.set("date_from", from); if (to) p.set("date_to", to); if (status) p.set("status", status);
    try { setData(await api<Page<Sale>>(`/sales?${p}`)); setError(""); } catch (e) { setError((e as Error).message); }
  }, [q, from, to, status, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);
  useEffect(() => { if (view) dlg.current?.showModal(); }, [view]);

  async function voidSale(s: Sale) {
    if (!confirm(`ยกเลิกใบเสร็จ ${s.receipt_no} ? (คืนสต็อกให้ทุกรายการ)`)) return;
    try { setView(await api<Sale>(`/sales/${s.id}/void`, { method: "POST", body: JSON.stringify({ reason }) })); setReason(""); load(); } catch (e) { setError((e as Error).message); }
  }

  const pages = data ? Math.max(1, Math.ceil(data.count / 10)) : 1;
  return (
    <div className="card flush">
      <div className="toolbar" style={{ padding: "16px 16px 0" }}>
        <input className="searchbox" placeholder="เลขใบเสร็จหรือชื่อลูกค้า" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="ค้นหาใบเสร็จ" />
        <label>ตั้งแต่ <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="ตั้งแต่วันที่" /></label>
        <label>ถึง <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="ถึงวันที่" /></label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="สถานะ"><option value="">ทุกสถานะ</option><option value="completed">สำเร็จ</option><option value="void">ยกเลิก</option></select>
      </div>
      {error && <div className="err" role="alert" style={{ padding: "0 16px" }}>{error}</div>}
      <table>
        <thead><tr><th>เลขที่</th><th>เวลา</th><th>ลูกค้า</th><th>ชำระ</th><th className="num">ยอดสุทธิ</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {data?.results.map((s) => (
            <tr key={s.id}>
              <td><b>{s.receipt_no}</b></td><td className="muted">{new Date(s.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</td>
              <td>{s.customer_name || <span className="muted">-</span>}</td><td>{PAYMENT_LABEL[s.payment]}</td><td className="num">{formatPrice(s.total)}</td>
              <td><span className={`badge ${s.status === "void" ? "out" : "ok"}`}>{s.status === "void" ? "ยกเลิก" : "สำเร็จ"}</span></td>
              <td><button className="sm" onClick={() => setView(s)}>ดูใบเสร็จ</button></td>
            </tr>
          ))}
          {data && data.results.length === 0 && <tr><td colSpan={7} className="empty">ไม่พบใบเสร็จ</td></tr>}
        </tbody>
      </table>
      <div className="pager"><span className="muted">{data ? `${data.count} ใบ · หน้า ${page}/${pages}` : ""}</span><button className="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button><button className="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button></div>
      <dialog ref={dlg} onClose={() => setView(null)}>
        {view && <>
          <Receipt sale={view} />
          <div className="toolbar noprint" style={{ marginTop: 14 }}>
            <button className="pri" onClick={() => window.print()}>พิมพ์</button>
            {me?.is_staff && view.status === "completed" && <><input value={reason} maxLength={200} placeholder="เหตุผลที่ยกเลิก" onChange={(e) => setReason(e.target.value)} aria-label="เหตุผลที่ยกเลิก" /><button className="danger" onClick={() => voidSale(view)}>ยกเลิกบิล</button></>}
            <button onClick={() => dlg.current?.close()}>ปิด</button>
          </div>
        </>}
      </dialog>
    </div>
  );
}
