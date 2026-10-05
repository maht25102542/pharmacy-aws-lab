# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

ทั้งโฟลเดอร์นี้คือ **GitHub repo ชื่อ `pharmacy-app`** ไม่ได้อยู่บน VM ไหนเลย

| ไฟล์ | ใครใช้ | ใช้เมื่อไหร่ |
|---|---|---|
| `Jenkinsfile` | Jenkins (VM `pharmacy-jenkins`) | ทุกครั้งที่กด build Jenkins ดึงไฟล์นี้จาก GitHub มาอ่านว่าต้องทำอะไร |
| `sonar-project.properties` | ขั้น SonarQube ใน pipeline | บอกว่าให้ตรวจโฟลเดอร์ไหน |
| `backend/`, `frontend/` | ขั้น docker build ใน pipeline | ถูก build เป็น image แล้ว push ขึ้น ECR |

ตัวโค้ดไม่เคยถูกวางบนเครื่อง Kubernetes โดยตรง สิ่งที่ไปถึงเครื่องคือ image ที่ build แล้ว
