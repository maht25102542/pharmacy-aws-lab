# ของจริงอยู่ที่: VM pharmacy-jenkins  /opt/jenkins/Dockerfile
# Jenkins พร้อมเครื่องมือที่ pipeline ต้องใช้: docker, aws, argocd
FROM jenkins/jenkins:lts

USER root

# docker CLI (ใช้ Docker ของเครื่องผ่าน socket), aws CLI
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git awscli \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && echo "deb [signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-buildx-plugin \
 && rm -rf /var/lib/apt/lists/*

# argocd CLI (ใช้ในขั้น sync)
RUN curl -fsSL -o /usr/local/bin/argocd \
      https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64 \
 && chmod +x /usr/local/bin/argocd

# ติดตั้งปลั๊กอินตั้งแต่ตอน build
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
