"use client";
import { formatPrice } from "@/lib/stock";
import { PAYMENT_LABEL, type Sale } from "@/lib/sales";

// ใบเสร็จ (พิมพ์ได้: กดพิมพ์แล้ว CSS @media print ซ่อนส่วนอื่นของหน้า)
export default function Receipt({ sale }: { sale: Sale }) {
  return (
    <div className="receipt" id="receipt">
      <div className="rc-head"><b>Pharmacy · ร้านยา</b><div className="muted">ใบเสร็จรับเงิน</div></div>
      <div className="rc-meta">
        <span>เลขที่ <b>{sale.receipt_no}</b></span>
        <span>{new Date(sale.created_at).toLocaleString("th-TH")}</span>
        <span>พนักงาน: {sale.created_by_name ?? "-"}</span>
        {sale.customer_name && <span>ลูกค้า: {sale.customer_name}</span>}
      </div>
      {sale.status === "void" && <div className="rc-void">ยกเลิกแล้ว{sale.void_reason ? `: ${sale.void_reason}` : ""} (โดย {sale.voided_by_name ?? "-"})</div>}
      <table>
        <thead><tr><th>รายการ</th><th className="num">ราคา</th><th className="num">จำนวน</th><th className="num">รวม</th></tr></thead>
        <tbody>{sale.items.map((i) => <tr key={i.id}><td>{i.name}<div className="muted">{i.sku}</div></td><td className="num">{formatPrice(i.unit_price)}</td><td className="num">{i.qty}</td><td className="num">{formatPrice(i.line_total)}</td></tr>)}</tbody>
      </table>
      <dl className="rc-sum">
        <dt>รวม</dt><dd>{formatPrice(sale.subtotal)}</dd>
        {Number(sale.discount) > 0 && <><dt>ส่วนลด</dt><dd>-{formatPrice(sale.discount)}</dd></>}
        <dt><b>ยอดสุทธิ</b></dt><dd><b>{formatPrice(sale.total)}</b></dd>
        <dt>ชำระ ({PAYMENT_LABEL[sale.payment]})</dt><dd>{formatPrice(sale.paid)}</dd>
        <dt>เงินทอน</dt><dd>{formatPrice(sale.change)}</dd>
      </dl>
      <div className="rc-foot muted">ขอบคุณที่ใช้บริการ</div>
    </div>
  );
}
