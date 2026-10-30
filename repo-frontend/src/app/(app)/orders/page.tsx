import OrdersPanel from "@/components/OrdersPanel";

export default function OrdersPage() {
  return (
    <>
      <div className="pagehead"><div><h1>สั่งซื้อยา</h1><p className="sub" style={{ margin: 0 }}>สร้างใบสั่งซื้อ → ส่งซัพพลายเออร์ → รับของเข้าคลัง (เปิดล็อตและเพิ่มสต็อกให้อัตโนมัติ รับบางส่วนได้)</p></div></div>
      <OrdersPanel />
    </>
  );
}
