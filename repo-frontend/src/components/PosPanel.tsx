"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Receipt from "@/components/Receipt";
import { api } from "@/lib/client";
import { addToCart, type CartLine, changeDue, parseMoney, type Sale, setQty, totals } from "@/lib/sales";
import { formatPrice, type Medicine, type Page } from "@/lib/stock";

// หน้าขายหน้าร้าน (POS): ค้นหายา → ใส่ตะกร้า → คิดเงิน/ทอน → ออกใบเสร็จ (ตัดสต็อกที่ backend ตอนกดชำระ)
export default function PosPanel() {
  const [q, setQ] = useState("");
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<"cash" | "transfer" | "card">("cash");
  const [paid, setPaid] = useState("");
  const [customer, setCustomer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Sale | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  const search = useCallback(async () => {
    try { setMeds((await api<Page<Medicine>>(`/medicines?page=1${q ? `&q=${encodeURIComponent(q)}` : ""}`)).results.filter((m) => m.is_active)); } catch (e) { setError((e as Error).message); }
  }, [q]);
  useEffect(() => { const t = setTimeout(search, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { if (done) dlg.current?.showModal(); }, [done]);

  const disc = parseMoney(discount || "0");
  const t = totals(cart, Number.isNaN(disc) ? 0 : disc);
  const paidN = payment === "cash" ? parseMoney(paid) : t.total;
  const change = Number.isNaN(paidN) ? NaN : changeDue(t.total, paidN);
  const canPay = cart.length > 0 && !busy && !Number.isNaN(disc) && (payment !== "cash" || (!Number.isNaN(change) && change >= 0));

  async function checkout() {
    setBusy(true); setError("");
    try {
      const sale = await api<Sale>("/sales", { method: "POST", body: JSON.stringify({ items: cart.map((l) => ({ medicine: l.id, qty: l.qty })), payment, paid: payment === "cash" ? paid.replace(/,/g, "") : undefined, discount: t.discount, customer_name: customer }) });
      setDone(sale); setCart([]); setDiscount(""); setPaid(""); setCustomer(""); search();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="pos">
      <div className="card flush">
        <div className="toolbar" style={{ padding: "16px 16px 0" }}><input className="searchbox" placeholder="ค้นหาชื่อหรือรหัสยา" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหายา" autoFocus /></div>
        <table>
          <thead><tr><th>ยา</th><th className="num">ราคา</th><th className="num">คงเหลือ</th><th></th></tr></thead>
          <tbody>
            {meds.map((m) => (
              <tr key={m.id}>
                <td>{m.name}<div className="muted">{m.sku}</div></td><td className="num">{formatPrice(m.price)}</td>
                <td className="num">{m.stock} <span className="muted">{m.unit}</span></td>
                <td><button className="sm pri" disabled={m.stock === 0} onClick={() => setCart(addToCart(cart, { id: m.id, sku: m.sku, name: m.name, unit: m.unit, price: Number(m.price), max: m.stock }))} aria-label={`เพิ่ม ${m.name}`}>{m.stock === 0 ? "หมด" : "+ เพิ่ม"}</button></td>
              </tr>
            ))}
            {meds.length === 0 && <tr><td colSpan={4} className="empty">ไม่พบยา</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card cart">
        <h2>ตะกร้า ({cart.reduce((s, l) => s + l.qty, 0)} ชิ้น)</h2>
        {cart.length === 0 && <div className="empty">เลือกยาจากรายการทางซ้าย</div>}
        {cart.map((l) => (
          <div className="cartline" key={l.id}>
            <div className="grow"><b>{l.name}</b><div className="muted">{formatPrice(l.price)} × {l.qty} = {formatPrice(l.price * l.qty)}</div></div>
            <button className="sm" onClick={() => setCart(setQty(cart, l.id, l.qty - 1))} aria-label={`ลด ${l.name}`}>−</button>
            <input className="qty" value={l.qty} inputMode="numeric" onChange={(e) => setCart(setQty(cart, l.id, Number(e.target.value)))} aria-label={`จำนวน ${l.name}`} />
            <button className="sm" disabled={l.qty >= l.max} onClick={() => setCart(setQty(cart, l.id, l.qty + 1))} aria-label={`เพิ่ม ${l.name}`}>+</button>
            <button className="sm danger" onClick={() => setCart(cart.filter((x) => x.id !== l.id))} aria-label={`ลบ ${l.name}`}>✕</button>
          </div>
        ))}
        <div className="form" style={{ marginTop: 14 }}>
          <label>ชื่อลูกค้า (ถ้ามี)<input value={customer} maxLength={120} onChange={(e) => setCustomer(e.target.value)} placeholder="เช่น คุณสมศรี" /></label>
          <div className="grid2">
            <label>ส่วนลด (บาท)<input value={discount} inputMode="decimal" onChange={(e) => setDiscount(e.target.value)} placeholder="0" aria-label="ส่วนลด" /></label>
            <label>ชำระด้วย<select value={payment} onChange={(e) => setPayment(e.target.value as typeof payment)} aria-label="วิธีชำระเงิน"><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="card">บัตร</option></select></label>
          </div>
          {payment === "cash" && <label>รับเงินมา (บาท)<input value={paid} inputMode="decimal" onChange={(e) => setPaid(e.target.value)} placeholder={String(t.total)} aria-label="รับเงินมา" /></label>}
        </div>
        <dl className="rc-sum big">
          <dt>รวม</dt><dd>{formatPrice(t.subtotal)}</dd>
          {t.discount > 0 && <><dt>ส่วนลด</dt><dd>-{formatPrice(t.discount)}</dd></>}
          <dt><b>ยอดสุทธิ</b></dt><dd><b>{formatPrice(t.total)}</b></dd>
          {payment === "cash" && <><dt>เงินทอน</dt><dd style={{ color: change < 0 ? "var(--out)" : undefined }}>{Number.isNaN(change) ? "-" : formatPrice(change)}</dd></>}
        </dl>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="pri" style={{ width: "100%", padding: 12 }} disabled={!canPay} onClick={checkout}>{busy ? "กำลังบันทึก…" : "ชำระเงิน"}</button>
      </div>
      <dialog ref={dlg} onClose={() => setDone(null)}>
        {done && <><Receipt sale={done} /><div className="toolbar noprint" style={{ marginTop: 14 }}><button className="pri" onClick={() => window.print()}>พิมพ์ใบเสร็จ</button><button onClick={() => dlg.current?.close()}>ปิด · ขายรายการต่อไป</button></div></>}
      </dialog>
    </div>
  );
}
