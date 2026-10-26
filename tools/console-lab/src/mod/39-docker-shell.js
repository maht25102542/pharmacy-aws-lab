// ===== docker บน laptop จำลอง: build / tag / push ขึ้น ECR (ใช้ API.ecrAction เดียวกับหน้า ECR) =====
function dkUser() { var w = whoAmI(); if (w.err) return { w: w }; var nm = String(w.arn || "").split("/").pop(); return { w: w, user: S.users.filter(function (u) { return u.name === nm; })[0] || null }; }
function shDockerLogin(line) {
  var reg = (/([0-9]+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com)/.exec(line) || [])[1];
  if (!reg) return { lines: ["Error: --password-stdin ต้องมี registry (เช่น 000000000000.dkr.ecr.ap-southeast-1.amazonaws.com)"] };
  var u = dkUser(); if (u.w.err) return { lines: [u.w.err === "NoCredentialProviders" ? "Unable to locate credentials. You can configure credentials by running \"aws configure\"." : "An error occurred (" + u.w.err + ") when calling the GetAuthorizationToken operation: " + u.w.msg, "Error: Cannot perform an interactive login from a non TTY device"] };
  if (!canDo(u.w, "ecr:GetAuthorizationToken")) return { lines: ["An error occurred (AccessDeniedException) when calling the GetAuthorizationToken operation: User: " + u.w.arn + " is not authorized to perform: ecr:GetAuthorizationToken on resource: * because no identity-based policy allows the ecr:GetAuthorizationToken action", "Error: Cannot perform an interactive login from a non TTY device"] };
  S.laptop.dockerReg = reg; return { lines: ["WARNING! Your credentials are stored unencrypted in '/home/swd/.docker/config.json'.", "Login Succeeded  (token อายุ 12 ชั่วโมง)"] };
}
function shDocker(a) {
  var sub = a[0], L = S.laptop; if (!L.images) L.images = [];
  if (!sub) return { lines: ["Usage: docker <build|tag|push|images>   (จำลอง)"] };
  if (sub === "images") return { lines: ["REPOSITORY".padEnd(60) + "TAG".padEnd(14) + "IMAGE ID"].concat(L.images.map(function (i) { return i.name.padEnd(60) + i.tag.padEnd(14) + i.id; })) };
  if (sub === "build") {
    var ti = a.indexOf("-t"), ref = ti >= 0 ? a[ti + 1] : "", dir = a.filter(function (x, i) { return x[0] !== "-" && i > 0 && a[i - 1] !== "-t"; }).pop() || ".";
    if (!ref) return { lines: ["ต้องใส่ -t <ชื่อ:tag> เช่น docker build -t pharmacy/api:v1.0.0 ./api"] };
    var nm = ref.split(":")[0], tag = ref.split(":")[1] || "latest"; L.images = L.images.filter(function (i) { return !(i.name === nm && i.tag === tag); }); var id = hash32(ref + Date.now()).slice(0, 12); L.images.push({ name: nm, tag: tag, id: id });
    return { lines: ["[+] Building 14.2s (9/9) FINISHED  (จำลอง: ไม่ได้ build จริง · ของจริงอ่าน Dockerfile ใน " + dir + ")", " => [internal] load build definition from Dockerfile", " => [1/4] FROM docker.io/library/python:3.12-slim", " => [4/4] COPY . .", " => exporting to image", " => => naming to " + nm + ":" + tag] };
  }
  if (sub === "tag") { var src = a[1], dst = a[2]; if (!src || !dst) return { lines: ["Usage: docker tag SOURCE_IMAGE[:TAG] TARGET_IMAGE[:TAG]"] }; var sn = src.split(":")[0], st = src.split(":")[1] || "latest", im = L.images.filter(function (i) { return i.name === sn && i.tag === st; })[0]; if (!im) return { lines: ["Error response from daemon: No such image: " + src] }; L.images.push({ name: dst.split(":")[0], tag: dst.split(":")[1] || "latest", id: im.id }); return { lines: [] }; }
  if (sub === "push") {
    var r0 = a[1] || "", name = r0.split(":")[0], tg = r0.split(":")[1] || "latest", im2 = L.images.filter(function (i) { return i.name === name && i.tag === tg; })[0], reg = name.split("/")[0], repoName = name.split("/").slice(1).join("/");
    if (!im2) return { lines: ["The push refers to repository [" + name + "]", "tag does not exist: " + r0 + "   (ต้อง docker build / docker tag ก่อน)"] };
    if (!/\.dkr\.ecr\./.test(reg)) return { lines: ["denied: requested access to the resource is denied  (จำลองเฉพาะ push ขึ้น ECR · ชื่อ image ต้องขึ้นต้นด้วย <account>.dkr.ecr.<region>.amazonaws.com/)"] };
    if (L.dockerReg !== reg) return { lines: ["The push refers to repository [" + name + "]", "no basic auth credentials  (ต้อง login ก่อน: aws ecr get-login-password --region " + REGION + " | docker login --username AWS --password-stdin " + reg + ")"] };
    var repo = S.repos.filter(function (x) { return x.name === repoName; })[0]; if (!repo) return { lines: ["The push refers to repository [" + name + "]", "name unknown: The repository with name '" + repoName + "' does not exist in the registry with id '" + ACCOUNT + "'"] };
    var u = dkUser(), res = API.ecrAction({ repoId: repo.id, principal: { type: "user", id: u.user && u.user.id }, op: "push", tag: tg });
    if (res.errors) return { lines: [String(res.errors[Object.keys(res.errors)[0]])] };
    var o = res.res; return { lines: ["The push refers to repository [" + name + "]"].concat(o.ok ? ["5f70bf18a086: Pushed", "a1c2d3e4f5a6: Pushed", tg + ": digest: sha256:" + hash32(name + tg) + hash32(tg + name) + " size: 1573"] : []).concat(String(o.out || "").split("\n").filter(Boolean)) };
  }
  return { lines: ["docker: จำลองเฉพาะ build / tag / push / images"] };
}
