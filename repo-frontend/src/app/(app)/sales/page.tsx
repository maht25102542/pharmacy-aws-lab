import PosPanel from "@/components/PosPanel";

export default function SalesPage() {
  return (
    <>
      <div className="pagehead"><div><h1>ขายหน้าร้าน</h1><p className="sub" style={{ margin: 0 }}>เลือกยา → คิดเงิน → ออกใบเสร็จ · สต็อกถูกตัดอัตโนมัติ (ล็อตที่หมดอายุก่อนออกก่อน)</p></div></div>
      <PosPanel />
    </>
  );
}
