import MedicineTable from "@/components/MedicineTable";

export default function MedicinesPage() {
  return (
    <>
      <div className="pagehead"><div><h1>สต็อกยา</h1><p className="sub" style={{ margin: 0 }}>ค้นหา รับเข้า จ่ายออก และจัดการรายการยา</p></div></div>
      <MedicineTable />
    </>
  );
}
