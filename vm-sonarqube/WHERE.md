# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

| ไฟล์ | อยู่บนเครื่อง | path จริง |
|---|---|---|
| `docker-compose.yml` | VM `pharmacy-sonarqube` | `/opt/sonarqube/docker-compose.yml` |
| `.env` (Ansible สร้างให้) | VM `pharmacy-sonarqube` | `/opt/sonarqube/.env` |
| ค่า kernel (Ansible สร้างให้) | VM `pharmacy-sonarqube` | `/etc/sysctl.d/99-sonarqube.conf` |

ใครเอาไปวาง: `ansible/sonarqube.yml`

Jenkins รู้ที่อยู่ของเครื่องนี้จากตัวแปร `SONAR_HOST_URL` ในไฟล์ `/opt/jenkins/.env` บนเครื่อง Jenkins
