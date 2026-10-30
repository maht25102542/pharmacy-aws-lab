import SuppliersPanel from "@/components/SuppliersPanel";

export default function SuppliersPage() {
  return (
    <>
      <div className="pagehead"><div><h1>ผู้จัดจำหน่าย</h1><p className="sub" style={{ margin: 0 }}>รายชื่อบริษัท/ร้านที่สั่งยาเข้ามา · แก้ไขได้โดยเภสัชกร/ผู้ดูแล</p></div></div>
      <SuppliersPanel />
    </>
  );
}
