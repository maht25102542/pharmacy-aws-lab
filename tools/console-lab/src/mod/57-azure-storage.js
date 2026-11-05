// ===== Azure Storage จำลอง (lab static site คู่กับ AWS S3 lab 01): storage account + container + blob + static website =====
// ใช้ state กลาง S.az (ดู 56-azure.js) · kind: sa = storage account, sc = blob container (blob เก็บใน p.blobs ของ container)
AZ_KINDS.sa = { ns: "Microsoft.Storage", t: "storageAccounts", label: "Storage account" };
AZ_KINDS.sc = { ns: "Microsoft.Storage", t: "blobContainers", label: "Blob container" };
AZ_DUR_MS.sa = 20000; AZ_DUR_MS.sc = 2000; AZ_TF_SECS.azurerm_storage_account = 20; AZ_TF_SECS.azurerm_storage_container = 2; AZ_TF_SECS.azurerm_storage_blob = 2; AZ_TF_SECS.azurerm_storage_account_static_website = 6;
var AZ_SA_REPL = ["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"];
function azRandKey() { var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", o = ""; for (var i = 0; i < 86; i++) o += c.charAt(Math.floor(Math.random() * c.length)); return o + "=="; }
function azSaByName(n) { return azOfKind("sa").filter(function (a) { return a.name === n; })[0] || null; }
function azSaWebUrl(a) { return "https://" + a.name + ".z23.web.core.windows.net/"; }
function azBlobUrl(a, c, b) { return "https://" + a.name + ".blob.core.windows.net/" + c + (b ? "/" + b : ""); }
TF_SCHEMA.azurerm_storage_account = azSch(azA(["account_tier", "account_replication_type", "account_kind", "min_tls_version", "allow_nested_items_to_be_public", "https_traffic_only_enabled", "access_tier"]), AZ_R3.concat(["account_tier", "account_replication_type"]), {}, ["tags", "min_tls_version", "allow_nested_items_to_be_public", "https_traffic_only_enabled", "access_tier", "account_replication_type"], ["id", "primary_web_endpoint", "primary_web_host", "primary_blob_endpoint", "primary_access_key", "primary_connection_string"]);
TF_SCHEMA.azurerm_storage_container = azSch(["name", "storage_account_name", "storage_account_id", "container_access_type"], ["name"], {}, ["container_access_type"], ["id"]);
TF_SCHEMA.azurerm_storage_blob = azSch(["name", "storage_account_name", "storage_container_name", "type", "content_type", "source_content", "source"], ["name", "storage_account_name", "storage_container_name", "type"], {}, ["content_type", "source_content", "source"], ["id", "url"]);
TF_SCHEMA.azurerm_storage_account_static_website = azSch(["storage_account_id", "index_document", "error_404_document"], ["storage_account_id"], {}, ["index_document", "error_404_document"], ["id"]);
TF_PROV.azurerm_storage_account = azProv("sa", {
  check: function (a) {
    var lb = "creating Storage Account \"" + a.name + "\"";
    if (!/^[a-z0-9]{3,24}$/.test(a.name)) throw azErr(lb, "AccountNameInvalid", a.name + " is not a valid storage account name. Storage account name must be between 3 and 24 characters in length and use numbers and lower-case letters only.");
    if (azOfKind("sa").some(function (x) { return x.name === a.name; })) throw azErr(lb, "StorageAccountAlreadyTaken", "The storage account named " + a.name + " is already taken.");
    if (["Standard", "Premium"].indexOf(a.account_tier) < 0) throw azErr(lb, "InvalidParameter", "account_tier must be Standard or Premium.");
    if (AZ_SA_REPL.indexOf(a.account_replication_type) < 0) throw azErr(lb, "InvalidParameter", "account_replication_type must be one of " + AZ_SA_REPL.join(", ") + ".");
    if (a.account_tier === "Premium" && ["LRS", "ZRS"].indexOf(a.account_replication_type) < 0) throw azErr(lb, "InvalidSkuName", "Premium storage accounts support only LRS or ZRS replication.");
  },
  props: function (a) { return { sku: a.account_tier, repl: a.account_replication_type, akind: a.account_kind || "StorageV2", pub: !!a.allow_nested_items_to_be_public, tls: a.min_tls_version || "TLS1_2", web: { on: false, index: "", err: "" }, keys: [azRandKey(), azRandKey()], atier: a.access_tier || "Hot" }; },
  comp: function (r) { return { primary_web_endpoint: azSaWebUrl(r), primary_web_host: r.name + ".z23.web.core.windows.net", primary_blob_endpoint: azBlobUrl(r, ""), primary_access_key: r.p.keys[0], primary_connection_string: "DefaultEndpointsProtocol=https;AccountName=" + r.name + ";AccountKey=" + r.p.keys[0] + ";EndpointSuffix=core.windows.net" }; },
  del: function (r) { if (r) S.az = azList().filter(function (x) { return !(x.kind === "sc" && x.p.account === r.id); }); }
});
TF_PROV.azurerm_storage_container = {
  create: function (c) {
    var a = c.attrs, lb = "creating Container \"" + a.name + "\"", acc = a.storage_account_id ? azByRef(a.storage_account_id) : azSaByName(a.storage_account_name);
    if (!acc || acc.kind !== "sa") throw azErr(lb, "AccountNotFound", "The specified storage account " + (a.storage_account_name || a.storage_account_id || "") + " does not exist.", "Status=404");
    if (!/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/.test(a.name) || /--/.test(a.name)) throw azErr(lb, "InvalidResourceName", "The specified resource name contains invalid characters. Container names must be 3-63 characters: lowercase letters, numbers and hyphens, starting and ending with a letter or number.");
    var acs = a.container_access_type || "private"; if (["private", "blob", "container"].indexOf(acs) < 0) throw azErr(lb, "InvalidParameter", "container_access_type must be private, blob or container.");
    if (acs !== "private" && !acc.p.pub) throw azErr(lb, "PublicAccessNotPermitted", "Public access is not permitted on this storage account (allow_nested_items_to_be_public = false).");
    if (azOfKind("sc").some(function (x) { return x.p.account === acc.id && x.name === a.name; })) throw azErr(lb, "ContainerAlreadyExists", "The specified container already exists.", "Status=409");
    var id = acc.id + "/blobServices/default/containers/" + a.name, r = { id: id, kind: "sc", name: a.name, rg: acc.rg, loc: acc.loc, tags: {}, p: { account: acc.id, access: acs, blobs: [] }, born: Date.now() };
    azList().push(r); return { id: id, computed: { id: id }, sim: { id: id } };
  },
  update: function (st, d) { var r = azByRef(st.id); if (r) r.p.access = d.container_access_type || "private"; },
  del: function (st) { S.az = azList().filter(function (x) { return x.id !== st.id; }); },
  read: function (st) { return azByRef(st.id) ? { cfg: {}, computed: {} } : null; }
};
function azBlobPut(sc, name, ct, content) { sc.p.blobs = sc.p.blobs.filter(function (b) { return b.name !== name; }); sc.p.blobs.push({ name: name, ct: ct || "application/octet-stream", content: content || "", size: (content || "").length || 1024, at: Date.now(), type: "Block blob" }); }
TF_PROV.azurerm_storage_blob = {
  create: function (c) {
    var a = c.attrs, lb = "creating Blob \"" + a.name + "\"", acc = azSaByName(a.storage_account_name);
    if (!acc) throw azErr(lb, "AccountNotFound", "The specified storage account " + a.storage_account_name + " does not exist.", "Status=404");
    var sc = azOfKind("sc").filter(function (x) { return x.p.account === acc.id && x.name === a.storage_container_name; })[0];
    if (!sc) throw azErr(lb, "ContainerNotFound", "The specified container does not exist.", "Status=404");
    if (a.type !== "Block") throw azErr(lb, "InvalidParameter", "type must be Block in the simulator.");
    var ct = a.content_type || (/\.html?$/.test(a.name) ? "text/html" : /\.css$/.test(a.name) ? "text/css" : /\.js$/.test(a.name) ? "application/javascript" : /\.json$/.test(a.name) ? "application/json" : /\.(png|jpg|svg)$/.test(a.name) ? "image/" + a.name.split(".").pop() : "application/octet-stream");
    azBlobPut(sc, a.name, ct, a.source_content || ""); var url = azBlobUrl(acc, sc.name, a.name);
    return { id: url, computed: { id: url, url: url }, sim: { sc: sc.id, name: a.name } };
  },
  update: function (st, d) { var sc = azByRef(st.sim.sc); if (sc) azBlobPut(sc, st.sim.name, d.content_type, d.source_content); },
  del: function (st) { var sc = azByRef(st.sim.sc); if (sc) sc.p.blobs = sc.p.blobs.filter(function (b) { return b.name !== st.sim.name; }); },
  read: function (st) { var sc = azByRef(st.sim.sc); return sc && sc.p.blobs.some(function (b) { return b.name === st.sim.name; }) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.azurerm_storage_account_static_website = {
  create: function (c) {
    var a = c.attrs, lb = "enabling static website for storage account", acc = azByRef(a.storage_account_id);
    if (!acc || acc.kind !== "sa") throw azErr(lb, "AccountNotFound", "The specified storage account does not exist.", "Status=404");
    if (["StorageV2", "BlockBlobStorage"].indexOf(acc.p.akind) < 0) throw azErr(lb, "StaticWebsiteNotSupported", "Static website hosting requires a StorageV2 or BlockBlobStorage account (this account is " + acc.p.akind + ").");
    acc.p.web = { on: true, index: a.index_document || "", err: a.error_404_document || "" };
    if (!azOfKind("sc").some(function (x) { return x.p.account === acc.id && x.name === "$web"; })) azList().push({ id: acc.id + "/blobServices/default/containers/$web", kind: "sc", name: "$web", rg: acc.rg, loc: acc.loc, tags: {}, p: { account: acc.id, access: "private", blobs: [], sys: true }, born: Date.now() });
    return { id: acc.id + "/staticWebsite", computed: { id: acc.id + "/staticWebsite" }, sim: { acc: acc.id } };
  },
  update: function (st, d) { var acc = azByRef(st.sim.acc); if (acc) acc.p.web = { on: true, index: d.index_document || "", err: d.error_404_document || "" }; },
  del: function (st) { var acc = azByRef(st.sim.acc); if (acc) { acc.p.web = { on: false, index: "", err: "" }; S.az = azList().filter(function (x) { return !(x.kind === "sc" && x.p.account === acc.id && x.name === "$web"); }); } },
  read: function (st) { var acc = azByRef(st.sim.acc); return acc && acc.p.web.on ? { cfg: {}, computed: {} } : null; }
};
// เปิด endpoint ของ static website (https://<account>.z23.web.core.windows.net/path): คืน { status, ct, body } จาก container $web
function azWebFetch(url) {
  var m = /^https?:\/\/([a-z0-9]+)\.z23\.web\.core\.windows\.net(\/[^?#]*)?/i.exec(String(url || "")); if (!m) return null;
  var acc = azSaByName(m[1].toLowerCase()); if (!acc) return { status: 404, ct: "text/html", body: "<h1>The requested URI does not represent any resource on the server.</h1>", dns: true };
  var w = acc.p.web; if (!w || !w.on) return { status: 404, ct: "text/html", body: "<h1>404 The requested content does not exist.</h1><p>Static website is not enabled on this storage account.</p>" };
  var sc = azOfKind("sc").filter(function (x) { return x.p.account === acc.id && x.name === "$web"; })[0], path = (m[2] || "/").replace(/^\//, ""); if (!path || /\/$/.test(path)) path += w.index || "index.html";
  var find = function (n) { return sc && sc.p.blobs.filter(function (b) { return b.name === n; })[0]; }, b = find(path);
  if (b) return { status: 200, ct: b.ct, body: b.content };
  var er = w.err && find(w.err); return er ? { status: 404, ct: er.ct, body: er.content } : { status: 404, ct: "text/html", body: "<h1>404 The requested content does not exist.</h1>" };
}
