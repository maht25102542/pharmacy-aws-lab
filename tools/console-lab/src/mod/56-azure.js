// ===== Azure จำลอง: resource ของ terraform-azure/ (state + provider azurerm) =====
// เก็บทุกอย่างเป็นรายการเดียว S.az = [{ id, kind, name, rg, loc, tags, p }] แล้วให้หน้า Portal (ui-azure.js) อ่านจากรายการนี้
// ตรวจกติกาหลักเท่าที่รู้จากเอกสาร Azure (ไม่ใช่ทุกกรณี)
var AZ_SUB = "00000000-1111-2222-3333-444444444444", AZ_TENANT = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
var AZ_LOCS = ["southeastasia", "eastasia", "japaneast", "westeurope", "eastus", "westus2", "australiaeast", "centralindia"];
var AZ_ZONAL = ["southeastasia", "eastasia", "japaneast", "westeurope", "eastus", "westus2", "australiaeast", "centralindia"];
var AZ_SIZES = ["Standard_B1s", "Standard_B1ms", "Standard_B2s", "Standard_B2ms", "Standard_D2s_v5", "Standard_D4s_v5"];
function azList() { if (!S.az) S.az = []; return S.az; }
function azHex(n) { return fakeId("", n, "0123456789abcdef"); }
function azGuid() { return azHex(8) + "-" + azHex(4) + "-" + azHex(4) + "-" + azHex(4) + "-" + azHex(12); }
function azRid(rg, ns, type, name) { return "/subscriptions/" + AZ_SUB + "/resourceGroups/" + rg + "/providers/" + ns + "/" + type + "/" + name; }
function azByRef(id) { id = String(id || "").toLowerCase(); return azList().filter(function (r) { return r.id.toLowerCase() === id; })[0] || null; }
function azOfKind(k) { return azList().filter(function (r) { return r.kind === k; }); }
function azRg(name) { return azList().filter(function (r) { return r.kind === "rg" && r.name.toLowerCase() === String(name || "").toLowerCase(); })[0] || null; }
function azErr(label, code, msg, status) { var e = new Error(label + ": " + (status || "Status=400") + " Code=\"" + code + "\" Message=\"" + msg + "\""); e.tfAws = true; return e; }
function azCidrIn(inner, outer) { var a = parseCidr(inner), b = parseCidr(outer); return !!a && !!b && a.base >= b.base && a.base + a.size <= b.base + b.size; }

// ชนิด -> { ns/type ใน resource ID, label ที่ Portal ใช้ }
var AZ_KINDS = {
  rg: { ns: "", t: "resourceGroups", label: "Resource group" },
  vnet: { ns: "Microsoft.Network", t: "virtualNetworks", label: "Virtual network" },
  subnet: { ns: "Microsoft.Network", t: "subnets", label: "Subnet" },
  pip: { ns: "Microsoft.Network", t: "publicIPAddresses", label: "Public IP address" },
  nat: { ns: "Microsoft.Network", t: "natGateways", label: "NAT gateway" },
  asg: { ns: "Microsoft.Network", t: "applicationSecurityGroups", label: "Application security group" },
  nsg: { ns: "Microsoft.Network", t: "networkSecurityGroups", label: "Network security group" },
  nic: { ns: "Microsoft.Network", t: "networkInterfaces", label: "Network interface" },
  vm: { ns: "Microsoft.Compute", t: "virtualMachines", label: "Virtual machine" },
  acr: { ns: "Microsoft.ContainerRegistry", t: "registries", label: "Container registry" },
  lb: { ns: "Microsoft.Network", t: "loadBalancers", label: "Load balancer" }
};

// สร้าง/ลบแบบกลาง · opts.check(a) คืนข้อความ error หรือ "" · opts.comp(r, a) คืน computed เพิ่ม
function azMake(kind, a, c, extra) {
  var k = AZ_KINDS[kind], rgName = kind === "rg" ? a.name : a.resource_group_name, label = "creating/updating " + k.label + " (Subscription: \"" + AZ_SUB + "\"\nResource Group Name: \"" + (rgName || "") + "\"\n" + k.label + " Name: \"" + a.name + "\")";
  if (kind !== "rg") {
    if (!azRg(rgName)) throw azErr(label, "ResourceGroupNotFound", "Resource group '" + rgName + "' could not be found.", "Status=404");
    if (a.location && AZ_LOCS.indexOf(String(a.location).toLowerCase().replace(/ /g, "")) < 0) throw azErr(label, "InvalidLocation", "The provided location '" + a.location + "' is not available for resource type '" + k.ns + "/" + k.t + "'.");
  }
  var dup = azList().filter(function (r) { return r.kind === kind && r.rg === rgName && r.name === a.name; })[0];
  if (dup) throw azErr(label, "ResourceExists", "A resource with the ID \"" + dup.id + "\" already exists - to be managed via Terraform this resource needs to be imported into the State.");
  var id = kind === "rg" ? "/subscriptions/" + AZ_SUB + "/resourceGroups/" + a.name : azRid(rgName, k.ns, k.t, a.name);
  var loc = String(a.location || (azRg(rgName) || {}).loc || "").toLowerCase().replace(/ /g, "");
  var r = { id: id, kind: kind, name: a.name, rg: rgName, loc: loc, tags: Object.assign({}, c.tags || a.tags || {}), p: Object.assign({}, extra || {}), born: Date.now() };
  azList().push(r); return r;
}
function azDel(label, kind, id) {
  var r = azByRef(id); if (!r) return;
  var kids = azList().filter(function (x) { return x !== r && (kind === "rg" ? x.rg.toLowerCase() === r.name.toLowerCase() : false); });
  S.az = azList().filter(function (x) { return x !== r && !(kind === "rg" && x.rg.toLowerCase() === r.name.toLowerCase()); });
}
// ลบ resource ที่ยังมีของอื่นอ้างอยู่ -> error ตามจริงของ Azure
function azInUse(label, r, code, msg) { throw azErr(label, code, msg); }

function azSch(args, req, blocks, inPlace, computed) { var s = sch(args, req, blocks, inPlace || ["tags"], computed || ["id"]); return s; }
var AZ_COMMON = ["name", "resource_group_name", "location", "tags"];
function azA(extra) { return AZ_COMMON.concat(extra || []); }
var AZ_R3 = ["name", "resource_group_name", "location"];
TF_SCHEMA.azurerm_resource_group = azSch(["name", "location", "tags"], ["name", "location"], {}, ["tags"]);
TF_SCHEMA.azurerm_virtual_network = azSch(azA(["address_space"]), AZ_R3.concat(["address_space"]), {}, ["tags", "address_space"]);
TF_SCHEMA.azurerm_subnet = azSch(["name", "resource_group_name", "virtual_network_name", "address_prefixes"], ["name", "resource_group_name", "virtual_network_name", "address_prefixes"], {}, ["address_prefixes"]);
TF_SCHEMA.azurerm_public_ip = azSch(azA(["allocation_method", "sku", "domain_name_label", "zones"]), AZ_R3.concat(["allocation_method"]), {}, ["tags", "domain_name_label"], ["id", "ip_address", "fqdn"]);
TF_SCHEMA.azurerm_nat_gateway = azSch(azA(["sku_name"]), AZ_R3, {}, ["tags"]);
TF_SCHEMA.azurerm_nat_gateway_public_ip_association = azSch(["nat_gateway_id", "public_ip_address_id"], ["nat_gateway_id", "public_ip_address_id"], {}, []);
TF_SCHEMA.azurerm_subnet_nat_gateway_association = azSch(["subnet_id", "nat_gateway_id"], ["subnet_id", "nat_gateway_id"], {}, []);
TF_SCHEMA.azurerm_application_security_group = azSch(azA(), AZ_R3, {}, ["tags"]);
var AZ_RULE = ["name", "priority", "direction", "access", "protocol", "source_port_range", "source_port_ranges", "destination_port_range", "destination_port_ranges", "source_address_prefix", "source_address_prefixes", "destination_address_prefix", "destination_address_prefixes", "source_application_security_group_ids", "destination_application_security_group_ids", "description"];
TF_SCHEMA.azurerm_network_security_group = azSch(azA(["security_rule"]), AZ_R3, { security_rule: { args: AZ_RULE, req: ["name", "priority", "direction", "access", "protocol"] } }, ["tags", "security_rule"]);
TF_SCHEMA.azurerm_subnet_network_security_group_association = azSch(["subnet_id", "network_security_group_id"], ["subnet_id", "network_security_group_id"], {}, []);
TF_SCHEMA.azurerm_network_interface = azSch(azA(["ip_configuration"]), AZ_R3, { ip_configuration: { args: ["name", "subnet_id", "private_ip_address_allocation", "public_ip_address_id"], req: ["name", "private_ip_address_allocation"] } }, ["tags"], ["id", "private_ip_address"]);
TF_SCHEMA.azurerm_network_interface_application_security_group_association = azSch(["network_interface_id", "application_security_group_id"], ["network_interface_id", "application_security_group_id"], {}, []);
TF_SCHEMA.azurerm_linux_virtual_machine = azSch(azA(["size", "zone", "admin_username", "network_interface_ids", "admin_ssh_key", "os_disk", "source_image_reference", "identity"]), AZ_R3.concat(["size", "admin_username", "network_interface_ids", "os_disk"]),
  { admin_ssh_key: { args: ["username", "public_key"], req: ["username", "public_key"] }, os_disk: { args: ["caching", "storage_account_type", "disk_size_gb"], req: ["caching", "storage_account_type"] }, source_image_reference: { args: ["publisher", "offer", "sku", "version"], req: ["publisher", "offer", "sku", "version"] }, identity: { args: ["type", "identity_ids"], req: ["type"] } },
  ["tags", "size"], ["id", "private_ip_address", "public_ip_address", "identity", "virtual_machine_id"]);
TF_SCHEMA.azurerm_container_registry = azSch(azA(["sku", "admin_enabled"]), AZ_R3.concat(["sku"]), {}, ["tags", "sku", "admin_enabled"], ["id", "login_server"]);
TF_SCHEMA.azurerm_role_assignment = azSch(["scope", "role_definition_name", "principal_id"], ["scope", "principal_id"], {}, [], ["id"]);
TF_SCHEMA.azurerm_lb = azSch(azA(["sku", "frontend_ip_configuration"]), AZ_R3, { frontend_ip_configuration: { args: ["name", "public_ip_address_id", "subnet_id"], req: ["name"] } }, ["tags"], ["id"]);
TF_SCHEMA.azurerm_lb_backend_address_pool = azSch(["name", "loadbalancer_id"], ["name", "loadbalancer_id"], {}, [], ["id"]);
TF_SCHEMA.azurerm_network_interface_backend_address_pool_association = azSch(["network_interface_id", "ip_configuration_name", "backend_address_pool_id"], ["network_interface_id", "ip_configuration_name", "backend_address_pool_id"], {}, []);
TF_SCHEMA.azurerm_lb_probe = azSch(["name", "loadbalancer_id", "protocol", "port", "request_path", "interval_in_seconds"], ["name", "loadbalancer_id", "port"], {}, ["port", "request_path", "interval_in_seconds"], ["id"]);
TF_SCHEMA.azurerm_lb_rule = azSch(["name", "loadbalancer_id", "protocol", "frontend_port", "backend_port", "frontend_ip_configuration_name", "backend_address_pool_ids", "probe_id", "disable_outbound_snat"], ["name", "loadbalancer_id", "protocol", "frontend_port", "backend_port", "frontend_ip_configuration_name"], {}, ["frontend_port", "backend_port", "probe_id", "backend_address_pool_ids", "disable_outbound_snat"], ["id"]);
TF_DATA_SCHEMA.azurerm_client_config = { args: [], req: [], blocks: {} };

// ---------- provider ----------
function azProv(kind, opts) {
  opts = opts || {};
  var lbl = AZ_KINDS[kind].label;
  return {
    create: function (c) {
      var a = c.attrs; if (opts.check) opts.check(a, c);
      var r = azMake(kind, a, c, opts.props ? opts.props(a) : {}), comp = { id: r.id };
      if (opts.comp) Object.assign(comp, opts.comp(r, a));
      r.p.comp = comp; return { id: r.id, computed: comp, sim: { id: r.id } };
    },
    update: function (st, d) { var r = azByRef(st.id); if (!r) return; if (d.tags) r.tags = Object.assign({}, d.tags); if (opts.props) Object.assign(r.p, opts.props(d)); },
    del: function (st) { if (opts.del) opts.del(azByRef(st.id), st); azDel("deleting " + lbl, kind, st.id); },
    read: function (st) { return azByRef(st.id) ? { cfg: {}, computed: {} } : null; }
  };
}
function azFromRef(id, kind, label, field) {
  var r = azByRef(id); if (!r || r.kind !== kind) throw azErr(label, "ResourceNotFound", "The Resource '" + String(id).split("/").slice(-2).join("/") + "' under resource group was not found.", "Status=404"); return r;
}
TF_PROV.azurerm_resource_group = azProv("rg", {
  del: function (r) { var n = azList().filter(function (x) { return x.kind !== "rg" && x.rg.toLowerCase() === r.name.toLowerCase(); }).length; /* Azure ลบ resource ในกลุ่มทั้งหมดตาม (prevent_deletion_if_contains_resources=false) */ return n; }
});
TF_PROV.azurerm_virtual_network = azProv("vnet", {
  check: function (a) { (a.address_space || []).forEach(function (c) { if (!parseCidr(c)) throw azErr("creating Virtual Network", "InvalidCIDRNotation", "The address prefix " + c + " in resource " + a.name + " is not formatted correctly."); }); },
  props: function (a) { return { space: (a.address_space || []).slice() }; }
});
TF_PROV.azurerm_subnet = {
  create: function (c) {
    var a = c.attrs, v = azList().filter(function (r) { return r.kind === "vnet" && r.name === a.virtual_network_name && r.rg === a.resource_group_name; })[0], lb = "creating Subnet \"" + a.name + "\" (Virtual Network \"" + a.virtual_network_name + "\")";
    if (!v) throw azErr(lb, "ResourceNotFound", "The Resource 'Microsoft.Network/virtualNetworks/" + a.virtual_network_name + "' under resource group '" + a.resource_group_name + "' was not found.", "Status=404");
    (a.address_prefixes || []).forEach(function (p) {
      if (!parseCidr(p)) throw azErr(lb, "InvalidCIDRNotation", "The address prefix " + p + " in resource " + a.name + " is not formatted correctly.");
      if (!v.p.space.some(function (s) { return azCidrIn(p, s); })) throw azErr(lb, "NetcfgInvalidSubnet", "Subnet '" + a.name + "' is not valid in virtual network '" + v.name + "'. Subnet PrefixList '" + p + "' is not contained in the virtual network address space.");
      azList().filter(function (r) { return r.kind === "subnet" && r.p.vnet === v.id; }).forEach(function (o) { o.p.prefixes.forEach(function (q) { var x = parseCidr(p), y = parseCidr(q); if (x.base < y.base + y.size && y.base < x.base + x.size) throw azErr(lb, "NetcfgSubnetRangesOverlap", "Subnet '" + a.name + "' is not valid because its IP address range overlaps with that of an existing subnet in virtual network '" + v.name + "'."); }); });
    });
    var r = azMake("subnet", { name: a.name, resource_group_name: a.resource_group_name }, c, { vnet: v.id, prefixes: (a.address_prefixes || []).slice() });
    r.id = v.id + "/subnets/" + a.name; r.loc = v.loc; return { id: r.id, computed: { id: r.id }, sim: {} };
  },
  update: function (st, d) { var r = azByRef(st.id); if (r) r.p.prefixes = (d.address_prefixes || []).slice(); },
  del: function (st) {
    var r = azByRef(st.id); if (!r) return;
    var used = azOfKind("nic").filter(function (n) { return n.p.subnet === r.id; });
    if (used.length) throw azErr("deleting Subnet \"" + r.name + "\"", "InUseSubnetCannotBeDeleted", "Subnet " + r.name + " is in use by " + used[0].id + " and cannot be deleted. In order to delete the subnet, delete all the resources within the subnet.");
    S.az = azList().filter(function (x) { return x !== r; });
  },
  read: function (st) { return azByRef(st.id) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.azurerm_public_ip = azProv("pip", {
  check: function (a) { if (a.sku === "Standard" && a.allocation_method === "Dynamic") throw azErr("creating Public IP Address", "PublicIPAddressDynamicNotSupported", "Public IP address " + a.name + " with Standard SKU must have Static allocation method."); },
  props: function (a) { return { sku: a.sku || "Basic", label: a.domain_name_label || "" }; },
  comp: function (r, a) { var ip = "20." + (40 + Math.floor(Math.random() * 190)) + "." + Math.floor(Math.random() * 255) + "." + (1 + Math.floor(Math.random() * 253)); r.p.ip = ip; var f = a.domain_name_label ? a.domain_name_label + "." + r.loc + ".cloudapp.azure.com" : ""; r.p.fqdn = f; return { ip_address: ip, fqdn: f }; },
  del: function (r) { if (r && (r.p.bound || [])[0]) throw azErr("deleting Public IP Address \"" + r.name + "\"", "PublicIPAddressCannotBeDeleted", "Public IP address " + r.id + " can not be deleted since it is still allocated to resource " + r.p.bound[0] + "."); }
});
TF_PROV.azurerm_nat_gateway = azProv("nat", { props: function (a) { return { pips: [], subnets: [] }; } });
TF_PROV.azurerm_application_security_group = azProv("asg");
TF_PROV.azurerm_network_security_group = azProv("nsg", {
  check: function (a) {
    var seen = {};
    (a.security_rule || []).forEach(function (x) {
      var lb = "creating Network Security Group \"" + a.name + "\"";
      if (!(x.priority >= 100 && x.priority <= 4096)) throw azErr(lb, "SecurityRuleInvalidPriority", "Security rule " + x.name + " has invalid Priority " + x.priority + ". Value must be between 100 and 4096.");
      var kk = x.direction + x.priority; if (seen[kk]) throw azErr(lb, "SecurityRuleParameterContainsConflictingValues", "Security rule " + x.name + " has the same priority and direction as rule " + seen[kk] + ". Priority must be unique per direction.");
      seen[kk] = x.name;
      if (["Inbound", "Outbound"].indexOf(x.direction) < 0) throw azErr(lb, "InvalidRequestFormat", "Cannot parse the request. direction must be Inbound or Outbound.");
      if (["Allow", "Deny"].indexOf(x.access) < 0) throw azErr(lb, "InvalidRequestFormat", "Cannot parse the request. access must be Allow or Deny.");
      var src = x.source_address_prefix || x.source_address_prefixes, dst = x.destination_address_prefix || x.destination_address_prefixes;
      if (!src && !(x.source_application_security_group_ids || []).length) throw azErr(lb, "SecurityRuleMissingSource", "Security rule " + x.name + " must specify a source address prefix or source application security group.");
      if (!dst && !(x.destination_application_security_group_ids || []).length) throw azErr(lb, "SecurityRuleMissingDestination", "Security rule " + x.name + " must specify a destination address prefix or destination application security group.");
      if (src && (x.source_application_security_group_ids || []).length) throw azErr(lb, "SecurityRuleParameterContainsConflictingValues", "Security rule " + x.name + " specifies both a source address prefix and a source application security group. Use one or the other.");
    });
  },
  props: function (a) { return { rules: (a.security_rule || []).map(function (x) { return { name: x.name, priority: x.priority, dir: x.direction, access: x.access, proto: x.protocol, dport: x.destination_port_range || (x.destination_port_ranges || []).join(","), src: x.source_address_prefix || (x.source_address_prefixes || []).join(",") || "ASG", dst: x.destination_address_prefix || "ASG" }; }).sort(function (x, y) { return x.priority - y.priority; }), subnets: [] }; }
});
TF_PROV.azurerm_network_interface = azProv("nic", {
  check: function (a) { var ic = (a.ip_configuration || [])[0]; if (!ic) throw azErr("creating Network Interface", "InvalidRequestFormat", "Network interface " + a.name + " must have at least one ip_configuration."); if (ic.subnet_id !== undefined && !azFromRef(ic.subnet_id, "subnet", "creating Network Interface \"" + a.name + "\"")) return; },
  props: function (a) { var ic = a.ip_configuration[0], sn = azByRef(ic.subnet_id); var pre = sn && sn.p.prefixes[0] || "10.0.0.0/24", b = pre.split("/")[0].split("."); var used = azOfKind("nic").length + 4; return { subnet: ic.subnet_id, pip: ic.public_ip_address_id || "", ip: b[0] + "." + b[1] + "." + b[2] + "." + used, asgs: [], pools: [], vm: "" }; },
  comp: function (r) { return { private_ip_address: r.p.ip }; }
});
TF_PROV.azurerm_linux_virtual_machine = azProv("vm", {
  check: function (a) {
    var lb = "creating Linux Virtual Machine \"" + a.name + "\" (Resource Group \"" + a.resource_group_name + "\")";
    if (a.zone && AZ_ZONAL.indexOf(String(a.location).toLowerCase()) < 0) throw azErr(lb, "InvalidParameter", "The zone(s) '" + a.zone + "' for resource 'Microsoft.Compute/virtualMachines/" + a.name + "' is not supported. The supported zones for location '" + a.location + "' are ''");
    if (a.zone && ["1", "2", "3"].indexOf(String(a.zone)) < 0) throw azErr(lb, "InvalidParameter", "The zone '" + a.zone + "' is not valid. Supported zones: 1, 2, 3.");
    if (AZ_SIZES.indexOf(a.size) < 0) throw azErr(lb, "InvalidParameter", "The VM size '" + a.size + "' is not available in location '" + a.location + "' for this subscription (ตัวจำลองรู้จัก: " + AZ_SIZES.join(", ") + ").");
    if ((a.os_disk || [])[0] && (a.os_disk[0].disk_size_gb || 30) < 30) throw azErr(lb, "InvalidParameter", "Disk size " + a.os_disk[0].disk_size_gb + " GB is smaller than the image size (30 GB). The OS disk must be at least 30 GB.");
    (a.network_interface_ids || []).forEach(function (n) { var nic = azFromRef(n, "nic", lb); if (nic.p.vm) throw azErr(lb, "NetworkInterfaceAlreadyInUse", "Network interface " + n + " is used by existing virtual machine " + nic.p.vm + "."); if (a.zone) { var pip = azByRef(nic.p.pip); if (pip && pip.p.sku === "Basic") throw azErr(lb, "InvalidParameter", "Basic SKU public IP " + pip.name + " cannot be used with zonal VM. Use Standard SKU."); } });
  },
  props: function (a) { var nic = azByRef((a.network_interface_ids || [])[0]); return { size: a.size, zone: String(a.zone || ""), nic: nic ? nic.id : "", user: a.admin_username, image: (a.source_image_reference || [{}])[0].offer || "", disk: (a.os_disk || [{}])[0].disk_size_gb || 30, state: "Running", principal: azGuid() }; },
  comp: function (r, a) {
    var nic = azByRef(r.p.nic); if (nic) { nic.p.vm = r.id; var pip = azByRef(nic.p.pip); if (pip) pip.p.bound = [r.id]; }
    return { private_ip_address: nic ? nic.p.ip : "", public_ip_address: nic && azByRef(nic.p.pip) ? azByRef(nic.p.pip).p.ip : "", virtual_machine_id: azHex(8) + "-" + azHex(4) + "-" + azHex(4) + "-" + azHex(4) + "-" + azHex(12), identity: [{ type: "SystemAssigned", principal_id: r.p.principal, tenant_id: AZ_TENANT, identity_ids: [] }] };
  },
  del: function (r) { var nic = r && azByRef(r.p.nic); if (nic) { nic.p.vm = ""; var pip = azByRef(nic.p.pip); if (pip) pip.p.bound = []; } }
});
TF_PROV.azurerm_container_registry = azProv("acr", {
  check: function (a) {
    var lb = "creating Container Registry \"" + a.name + "\"";
    if (!/^[a-zA-Z0-9]{5,50}$/.test(a.name)) throw azErr(lb, "InvalidParameter", "The registry name '" + a.name + "' is invalid. Registry names must be 5-50 characters and contain only letters and numbers.");
    if (azOfKind("acr").some(function (x) { return x.name.toLowerCase() === a.name.toLowerCase(); })) throw azErr(lb, "AlreadyExists", "The registry DNS name " + a.name.toLowerCase() + ".azurecr.io is already in use.");
    if (["Basic", "Standard", "Premium"].indexOf(a.sku) < 0) throw azErr(lb, "InvalidParameter", "The sku '" + a.sku + "' is invalid. Supported: Basic, Standard, Premium.");
  },
  props: function (a) { return { sku: a.sku, admin: !!a.admin_enabled, repos: [] }; },
  comp: function (r) { return { login_server: r.name.toLowerCase() + ".azurecr.io" }; }
});
TF_PROV.azurerm_lb = azProv("lb", {
  check: function (a) { if (!(a.frontend_ip_configuration || []).length) throw azErr("creating Load Balancer \"" + a.name + "\"", "InvalidRequestFormat", "Load balancer must have at least one frontend_ip_configuration."); (a.frontend_ip_configuration || []).forEach(function (f) { var p = f.public_ip_address_id && azByRef(f.public_ip_address_id); if (a.sku === "Standard" && p && p.p.sku !== "Standard") throw azErr("creating Load Balancer \"" + a.name + "\"", "NetworkingInternalOperationError", "Standard load balancer requires a Standard SKU public IP; " + p.name + " is " + p.p.sku + "."); }); },
  props: function (a) { return { sku: a.sku || "Basic", frontends: (a.frontend_ip_configuration || []).map(function (f) { var p = azByRef(f.public_ip_address_id); return { name: f.name, ip: p ? p.p.ip : "", fqdn: p ? p.p.fqdn : "" }; }), pools: [], probes: [], rules: [] }; }
});

// ---------- resource ลูก (ไม่มี ID แยก ผูกเข้ากับพ่อ) ----------
function azChild(kind, parentKey, mk, rmv) {
  return {
    create: function (c) {
      var a = c.attrs, par = azByRef(a[parentKey]); if (!par) throw azErr("creating " + kind, "ResourceNotFound", "The Resource '" + String(a[parentKey]).split("/").slice(-2).join("/") + "' was not found.", "Status=404");
      var id = mk(par, a); return { id: id, computed: { id: id }, sim: { parent: par.id } };
    },
    update: function () {},
    del: function (st) { var par = azByRef((st.sim || {}).parent); if (par) rmv(par, st); },
    read: function (st) { var par = azByRef((st.sim || {}).parent); return par ? { cfg: {}, computed: {} } : null; }
  };
}
function azAddTo(arr, v) { if (arr.indexOf(v) < 0) arr.push(v); }
function azRemFrom(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); }
TF_PROV.azurerm_nat_gateway_public_ip_association = azChild("NAT gateway IP association", "nat_gateway_id", function (nat, a) { var pip = azFromRef(a.public_ip_address_id, "pip", "associating public IP with NAT gateway"); if (pip.p.sku !== "Standard") throw azErr("associating public IP with NAT gateway", "InvalidRequest", "NAT gateway requires Standard SKU public IP."); azAddTo(nat.p.pips, pip.id); pip.p.bound = [nat.id]; return nat.id + "|" + pip.id; }, function (nat, st) { nat.p.pips = []; var pip = azByRef(st.id.split("|")[1]); if (pip) pip.p.bound = []; });
TF_PROV.azurerm_subnet_nat_gateway_association = azChild("subnet NAT gateway association", "subnet_id", function (sn, a) { var nat = azFromRef(a.nat_gateway_id, "nat", "associating NAT gateway with subnet"); sn.p.nat = nat.id; azAddTo(nat.p.subnets, sn.id); return sn.id; }, function (sn) { var nat = azByRef(sn.p.nat); if (nat) azRemFrom(nat.p.subnets, sn.id); sn.p.nat = ""; });
TF_PROV.azurerm_subnet_network_security_group_association = azChild("subnet NSG association", "subnet_id", function (sn, a) { var n = azFromRef(a.network_security_group_id, "nsg", "associating NSG with subnet"); sn.p.nsg = n.id; azAddTo(n.p.subnets, sn.id); return sn.id; }, function (sn) { var n = azByRef(sn.p.nsg); if (n) azRemFrom(n.p.subnets, sn.id); sn.p.nsg = ""; });
TF_PROV.azurerm_network_interface_application_security_group_association = azChild("NIC ASG association", "network_interface_id", function (nic, a) { var g = azFromRef(a.application_security_group_id, "asg", "associating NIC with ASG"); azAddTo(nic.p.asgs, g.id); return nic.id + "|" + g.id; }, function (nic, st) { nic.p.asgs = []; });
TF_PROV.azurerm_lb_backend_address_pool = azChild("backend address pool", "loadbalancer_id", function (lb, a) { azAddTo(lb.p.pools, a.name); return lb.id + "/backendAddressPools/" + a.name; }, function (lb, st) { azRemFrom(lb.p.pools, st.id.split("/").pop()); });
TF_PROV.azurerm_lb_probe = azChild("LB probe", "loadbalancer_id", function (lb, a) { lb.p.probes.push({ name: a.name, proto: a.protocol || "Tcp", port: a.port, path: a.request_path || "" }); return lb.id + "/probes/" + a.name; }, function (lb, st) { lb.p.probes = lb.p.probes.filter(function (x) { return x.name !== st.id.split("/").pop(); }); });
TF_PROV.azurerm_lb_rule = azChild("LB rule", "loadbalancer_id", function (lb, a) {
  var lbl = "creating Load Balancer Rule \"" + a.name + "\"";
  if (lb.p.rules.some(function (x) { return x.front === a.frontend_port && x.name !== a.name; })) throw azErr(lbl, "LoadBalancingRuleCollision", "Load balancer rule " + a.name + " uses frontend port " + a.frontend_port + " that is already used by another rule on the same frontend.");
  if (!lb.p.frontends.some(function (f) { return f.name === a.frontend_ip_configuration_name; })) throw azErr(lbl, "ReferencedResourceNotFound", "Frontend IP configuration '" + a.frontend_ip_configuration_name + "' was not found on load balancer " + lb.name + ".");
  var pr = String(a.probe_id || "").split("/").pop();
  lb.p.rules.push({ name: a.name, proto: a.protocol, front: a.frontend_port, back: a.backend_port, probe: pr, pool: (a.backend_address_pool_ids || []).map(function (x) { return x.split("/").pop(); }).join(",") }); return lb.id + "/loadBalancingRules/" + a.name;
}, function (lb, st) { lb.p.rules = lb.p.rules.filter(function (x) { return x.name !== st.id.split("/").pop(); }); });
TF_PROV.azurerm_network_interface_backend_address_pool_association = {
  create: function (c) { var a = c.attrs, nic = azFromRef(a.network_interface_id, "nic", "associating NIC with backend pool"); azAddTo(nic.p.pools, a.backend_address_pool_id); var id = nic.id + "/ipConfigurations/" + a.ip_configuration_name + "|" + a.backend_address_pool_id; return { id: id, computed: { id: id }, sim: { nic: nic.id, pool: a.backend_address_pool_id } }; },
  update: function () {}, del: function (st) { var n = azByRef(st.sim.nic); if (n) azRemFrom(n.p.pools, st.sim.pool); },
  read: function (st) { return azByRef(st.sim.nic) ? { cfg: {}, computed: {} } : null; }
};
TF_PROV.azurerm_role_assignment = {
  create: function (c) {
    var a = c.attrs, lb = "creating Role Assignment", sc = azByRef(a.scope);
    if (!sc) throw azErr(lb, "ScopeNotFound", "The scope '" + a.scope + "' was not found.", "Status=404");
    if (["AcrPull", "AcrPush", "Owner", "Contributor", "Reader"].indexOf(a.role_definition_name) < 0) throw azErr(lb, "RoleDefinitionDoesNotExist", "The role definition '" + a.role_definition_name + "' does not exist (ตัวจำลองรู้จัก: AcrPull, AcrPush, Owner, Contributor, Reader).");
    var vm = azOfKind("vm").filter(function (v) { return v.p.principal === a.principal_id; })[0];
    if (!vm) throw azErr(lb, "PrincipalNotFound", "Principal " + a.principal_id + " does not exist in the directory " + AZ_TENANT + ".");
    var id = sc.id + "/providers/Microsoft.Authorization/roleAssignments/" + azGuid();
    (sc.p.roles = sc.p.roles || []).push({ id: id, role: a.role_definition_name, vm: vm.name, principal: a.principal_id }); return { id: id, computed: { id: id }, sim: { scope: sc.id } };
  },
  update: function () {}, del: function (st) { var s = azByRef(st.sim.scope); if (s) s.p.roles = (s.p.roles || []).filter(function (r) { return r.id !== st.id; }); },
  read: function (st) { return azByRef(st.sim.scope) ? { cfg: {}, computed: {} } : null; }
};

// data azurerm_client_config: ผูกกับ az login จำลอง
var tfReadDataAws = tfReadData;
tfReadData = function (node, env, attrs) {
  if (node.type === "azurerm_client_config") return { subscription_id: AZ_SUB, tenant_id: AZ_TENANT, client_id: "04b07795-8ddb-461a-bbee-02f9e1bf7b46", object_id: azGuid(), id: "clientConfigs/clientId=04b07795;objectId=0;subscriptionId=" + AZ_SUB + ";tenantId=" + AZ_TENANT };
  return tfReadDataAws(node, env, attrs);
};
