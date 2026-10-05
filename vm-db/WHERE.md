# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

| ไฟล์ | อยู่บนเครื่อง | path จริง |
|---|---|---|
| `60-galera.cnf.j2` | VM `pharmacy-db-1`, `-2`, `-3` (ทุกเครื่อง) | `/etc/mysql/mariadb.conf.d/60-galera.cnf` |

ใครเอาไปวาง: `ansible/db.yml`

ไฟล์นี้เป็นแม่แบบ ค่าในปีกกา `{{ }}` จะถูกแทนด้วย IP ของแต่ละเครื่องตอน Ansible รัน
ไฟล์บนทั้ง 3 เครื่องจึงเกือบเหมือนกัน ต่างกันแค่บรรทัด `wsrep_node_address` และ `wsrep_node_name`

ฐานข้อมูลไม่ได้อยู่ใน flow ของ Jenkins และ ArgoCD เครื่องเหล่านี้ถูกตั้งค่าครั้งเดียวด้วย Ansible

ดูของจริงบนเครื่อง:

    ssh ubuntu@<IP ของ pharmacy-db-1>
    sudo mariadb -e "SHOW STATUS LIKE 'wsrep_cluster_size';"

ถ้าได้ค่า 3 แปลว่าทั้ง 3 เครื่องรวมเป็น cluster เดียวกันแล้ว
