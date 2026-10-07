// ===== คำสั่ง terraform ที่เรียกจากเทอร์มินัล (ไม่มี DOM) =====
function tfDir() { return S.laptop.cwd; }
function tfInitCmd(dir, upgrade) {
  var files = tfFilesIn(dir), out = [];
  if (!Object.keys(files).length) return ["Terraform initialized in an empty directory!", "", "The directory has no Terraform configuration files. You may begin working", "with Terraform immediately by creating Terraform configuration files."];
  var cfg = tfLoad(files); if (cfg.errors.length) return tfFmtErrors(cfg.errors, cfg);
  var req = ["aws", "local"].filter(function (p) { return Object.keys(cfg.res).some(function (a) { return cfg.res[a].type.indexOf(p === "aws" ? "aws_" : "local_") === 0; }) || Object.keys(cfg.data).some(function (a) { return cfg.data[a].type.indexOf("aws_") === 0 && p === "aws"; }); });
  if (S.faults.providerLock && !upgrade) return ["Initializing the backend...", "", "Initializing provider plugins...", "- Reusing previous version of hashicorp/aws from the dependency lock file", "╷", "│ Error: Failed to query available provider packages", "│ ", "│ Could not retrieve the list of available versions for provider hashicorp/aws: locked provider registry.terraform.io/hashicorp/aws 4.67.0 does not match configured version constraint >= 5.0; must use terraform init -upgrade to allow selection of new versions", "╵"];
  if (S.faults.providerLock && upgrade) delete S.faults.providerLock;
  out.push("Initializing the backend...", "", "Initializing provider plugins...");
  req.forEach(function (p) { out.push("- Finding hashicorp/" + p + " versions matching \"" + (p === "aws" ? ">= 5.0" : ">= 2.4") + "\"...", "- Installing hashicorp/" + p + " (จำลอง: ไม่ได้ดาวน์โหลดจริง)...", "- Installed hashicorp/" + p + " (signed by HashiCorp)"); });
  out.push("", "Terraform has created a lock file .terraform.lock.hcl to record the provider", "selections it made above. Include this file in your version control repository", "so that Terraform can guarantee to make the same selections by default when", "you run \"terraform init\" in the future.", "", "Terraform has been successfully initialized!", "", "You may now begin working with Terraform. Try running \"terraform plan\" to see", "any changes that are required for your infrastructure. All Terraform commands", "should now work.");
  S.tf.inited = true; return out;
}
function tfValidateCmd(dir) {
  var files = tfFilesIn(dir), cfg = tfLoad(files), errs = tfValidate(cfg);
  if (!errs.length) return ["Success! The configuration is valid.", ""];
  return tfFmtErrors(errs, cfg);
}
// คืน {lines} หรือ {needVars:[ชื่อ]} หรือ {lines, confirm: fn}
function tfPlanCmd(dir, cli, destroy) {
  var out = []; if (!tfRequireInit(out)) return { lines: out };
  var prep = tfPrepare({ dir: dir, cli: cli }); if (prep.fail) return { lines: prep.fail };
  if (prep.missing.length) return { needVars: prep.missing, cfg: prep.cfg };
  var res;
  if (destroy) {
    var st = S.tf.state, acts = Object.keys(st).map(function (k) { return { addr: k, type: st[k].type, name: st[k].name, act: "destroy", old: st[k] }; });
    res = { actions: acts, outputs: {}, drift: [], failed: null };
    var lines = []; if (!acts.length) lines.push("No changes. Your infrastructure matches the configuration."); else { var t = tfPlanText(res); lines = t.slice(); var oc = Object.keys(S.tf.outputs); if (oc.length) { lines.push("", "Changes to Outputs:"); oc.forEach(function (k) { lines.push("  - " + k + " = " + tfOutFmt(S.tf.outputs[k]).replace(/\n/g, "\n    ") + " -> null"); }); } }
    return { lines: lines, destroy: true, prep: prep, acts: acts };
  }
  res = tfExec({ prep: prep, mode: "plan", out: out });
  if (res.fail) return { lines: res.fail };
  if (res.failed) return { lines: tfErrFrom(res.failed.e, res.cfg, res.failed.node, res.failed.addr) };
  var lines = tfPlanText(res), creates = res.actions.filter(function (a) { return a.type === "aws_instance" && a.act === "create"; });
  if (creates.length) {
    var run = S.insts.filter(function (i) { return i.state === "running"; }).length * 2, add = creates.reduce(function (n, a) { return n + (VCPU[(a.attrs || {}).instance_type] || 2); }, 0), tot = run + add;
    lines.push("", "Console Lab: vCPU ที่จะรันหลัง apply = " + tot + " (ใหม่ " + add + " + เดิม " + run + ")  เทียบ default quota " + VCPU_QUOTA + " ของ Running On-Demand Standard instances", tot > VCPU_QUOTA ? "  ⚠ เกิน default quota: บนบัญชีใหม่ apply จะล้มด้วย VcpuLimitExceeded ตรวจ Service Quotas → EC2 ก่อน แล้ว Request increase หรือลดจำนวนเครื่อง (k8s_node_count, db_count)" : "  OK ไม่เกิน default quota");
  }
  return { lines: lines, res: res, prep: prep };
}
function tfApplyCmd(plan) {
  var out = [];
  if (plan.destroy) {
    var acts = plan.acts.slice(); var r = tfApplyDestroys(acts, plan.prep.cfg, out); S.tf.serial++;
    if (r) { out.push.apply(out, tfErrFrom(r.e, plan.prep.cfg, r.node, r.addr)); return out; }
    S.tf.outputs = {}; S.tf.fresh = {}; S.tf.hit = {}; out.push("", "Destroy complete! Resources: " + acts.length + " destroyed."); return out;
  }
  var res = tfExec({ prep: plan.prep, mode: "apply", out: out });
  if (res.fail) return res.fail;
  var cn = tfCounts(res.actions); S.tf.serial++;
  if (res.failed) { out.push.apply(out, ["", "Apply failed (บางส่วนถูกสร้างไปแล้ว และถูกบันทึกใน state)"]); out.push.apply(out, tfErrFrom(res.failed.e, res.cfg, res.failed.node, res.failed.addr)); return out; }
  S.tf.outputs = res.outputs;
  out.push("", "Apply complete! Resources: " + cn.a + " added, " + cn.c + " changed, " + cn.d + " destroyed."); out.push.apply(out, tfOutputsText(res.outputs));
  return out;
}
function tfOutputCmd(name) {
  var o = S.tf.outputs, ks = Object.keys(o);
  if (!ks.length) return ["╷", "│ Warning: No outputs found", "│ ", "│ The state file either has no outputs defined, or all the defined outputs are empty. Please define an output in your configuration with the `output` keyword and run `terraform refresh` for it to become available.", "╵"];
  if (name) { if (!(name in o)) return ["╷", "│ Error: Output \"" + name + "\" not found", "│ ", "│ The output variable requested could not be found in the state file.", "╵"]; return [tfOutFmt(o[name])]; }
  return ks.sort().map(function (k) { return k + " = " + tfOutFmt(o[k]); });
}
function tfStateList() { var ks = Object.keys(S.tf.state).sort(); return ks.length ? ks : ["(state ว่าง: ยังไม่ได้ terraform apply)"]; }
function tfStateShow(addr) {
  var s = S.tf.state[addr]; if (!s) return ["No instance found for the given address!", "", "This command requires that the address references one specific instance.", "To view the available instances, use \"terraform state list\". Please", "modify the address to reference a specific instance."];
  var out = ["# " + addr + ":", "resource \"" + s.type + "\" \"" + s.name + "\" {"]; Object.keys(s.computed).forEach(function (k) { out.push("    " + k + " = " + tfOutFmt(s.computed[k]).replace(/\n/g, "\n    ")); }); Object.keys(s.cfg).forEach(function (k) { if (k.indexOf("__") !== 0 && !(k in s.computed) && k !== "id") out.push("    " + k + " = " + tfOutFmt(s.cfg[k]).replace(/\n/g, "\n    ")); }); out.push("}"); return out;
}
