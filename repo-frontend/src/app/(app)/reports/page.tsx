import ReportsPanel from "@/components/ReportsPanel";

export default function ReportsPage() {
  return (
    <>
      <div className="pagehead"><div><h1>รายงาน</h1><p className="sub" style={{ margin: 0 }}>ยอดขาย ยาขายดี และยาที่ใกล้หมดอายุ</p></div></div>
      <ReportsPanel />
    </>
  );
}
