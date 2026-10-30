import ReceiptsPanel from "@/components/ReceiptsPanel";

export default function ReceiptsPage() {
  return (
    <>
      <div className="pagehead"><div><h1>ใบเสร็จ</h1><p className="sub" style={{ margin: 0 }}>ประวัติการขายทั้งหมด · ยกเลิกบิลได้โดยเภสัชกร/ผู้ดูแล (คืนสต็อกให้)</p></div></div>
      <ReceiptsPanel />
    </>
  );
}
