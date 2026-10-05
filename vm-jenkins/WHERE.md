# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

| ไฟล์ | อยู่บนเครื่อง | path จริง |
|---|---|---|
| `Dockerfile` | VM `pharmacy-jenkins` | `/opt/jenkins/Dockerfile` |
| `docker-compose.yml` | VM `pharmacy-jenkins` | `/opt/jenkins/docker-compose.yml` |
| `plugins.txt` | VM `pharmacy-jenkins` | `/opt/jenkins/plugins.txt` |
| `.env` (Ansible สร้างให้) | VM `pharmacy-jenkins` | `/opt/jenkins/.env` |

ใครเอาไปวาง: `ansible/jenkins.yml`

ข้อมูลของ Jenkins (job, ประวัติ build, credentials) ไม่ได้อยู่ในโฟลเดอร์นี้
แต่อยู่ใน Docker volume ชื่อ `jenkins_home` บนเครื่องเดียวกัน

ดูของจริงบนเครื่อง:

    ssh ubuntu@<IP ของ pharmacy-jenkins>
    cd /opt/jenkins && sudo docker compose ps
    sudo docker logs jenkins
