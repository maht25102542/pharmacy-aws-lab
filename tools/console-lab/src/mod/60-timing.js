// ===== โหมด "เวลาเหมือนจริง": คำนวณหน่วงเวลาต่อบรรทัดของ output (ไม่มี DOM) =====
// ponytail: ค่าวินาทีเป็นประมาณจากความจำ ไม่ได้วัดจาก AWS จริง และ terraform จริงสร้างหลาย resource ขนานกัน ตัวจำลองเล่นทีละอัน
var TASK_SEC = {
  "Gathering Facts": 2, "Install packages": 40, "Stop MariaDB before the first bootstrap": 3, "Start a new cluster": 8, "Start MariaDB (joins the cluster and copies data)": 15,
  "Create pharmacy_dev, pharmacy_prd and the app user": 3, "Install k3s server": 35, "Wait for the join token": 3, "Install k3s server and join the cluster": 40,
  "Wait until the node is ready": 20, "Apply base objects": 5, "Create argocd namespace": 2, "Install ArgoCD": 45, "Install AWS CLI (ใช้ขอรหัสผ่านชั่วคราวของ ECR)": 20,
  "Run the refresh once now": 3, "Apply service account, binding and token secret": 3, "Install Docker": 60, "Start SonarQube": 90, "Build and start Jenkins": 150
};
// คืนอาร์เรย์มิลลิวินาทีที่ต้องรอ "ก่อนแสดง" แต่ละบรรทัด
function timingPlan(lines) {
  var d = [], task = null, first = false, lastEl = 0;
  lines.forEach(function (l) {
    var ms = 0, m;
    if ((m = /^TASK \[(.*?)\] \*+/.exec(l))) { task = m[1]; first = true; }
    else if (/^(changed|ok|failed|fatal|skipping|unreachable)[:!]? ?\[|^fatal:/.test(l)) {
      if (first) { var s = /^skipping/.test(l) ? 0.1 : /^ok/.test(l) && task !== "Gathering Facts" ? 1 : (TASK_SEC[task] != null ? TASK_SEC[task] : 2); ms = s * 1000; first = false; } else ms = 300;
    }
    else if (/: Creating\.\.\.$/.test(l)) lastEl = 0;
    else if ((m = /: Still creating\.\.\. \[(\d+)s elapsed\]/.exec(l))) { ms = Math.max(0, +m[1] - lastEl) * 1000; lastEl = +m[1]; }
    else if ((m = /: (?:Creation|Destruction|Modifications) complete after (\d+)s/.exec(l))) { ms = Math.max(0.5, +m[1] - lastEl) * 1000; lastEl = 0; }
    d.push(ms);
  });
  return d;
}
