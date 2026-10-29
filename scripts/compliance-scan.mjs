// Compliance scan of the built site. Run after `next build`:  node scripts/compliance-scan.mjs
// Fails (exit 1) if a page breaks a business rule in AGENTS.md:
// - Illinois pages offer roofing (225 ILCS 335: no roofing until the IL license)
// - a claim we may never make (workers' comp, GAF Certified, Owens Corning Preferred, BBB A+, "500+ roofs")
// - a per-square price or "Premium from" (whole-roof totals only, owner decision Oct 29 2026)
// - the homepage estimator or its text cost section is missing
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2] ?? ".next/server/app";
if (!fs.existsSync(path.join(dir, "index.html"))) {
  console.error(`No built pages in ${dir}. Run "npx next build" first.`);
  process.exit(1);
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".html")) files.push(p);
  }
})(dir);

const route = (p) => "/" + path.relative(dir, p).replace(/\\/g, "/").replace(/\.html$/, "").replace(/^index$/, "");
const text = (h) => h.replace(/<!-- -->/g, "").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

const allowed = /RoofingnearmeSTL|roofing coming soon after il license|roofing in illinois|do you do roofing in|roofing is (available|missouri only)[^.]*|roofing pricing shown for missouri only|roofing in missouri/gi;
const banned = /\broof(er|ers|ing company|ing contractor|ing services?| repair| replacement| inspection| leak|s? (repaired|replaced|inspected))|\b(re-?roof|tarp|tarping|shingles?)\b|replace (your|the) roof|new roof|free photo-documented (roof )?report/i;
const neverClaim = /workers'? ?comp|\$2M Liability|GAF Certified|Owens Corning Preferred|BBB A\+|500\+ roofs/i;
const perSquare = /\$[\d,]+\s*\/\s*SQ\b|per square(?! f)|Premium from/i;

const errors = [];
let pages = 0, ilPages = 0;
for (const f of files) {
  const r = route(f);
  if (r.startsWith("/_")) continue;
  pages++;
  const h = fs.readFileSync(f, "utf8");
  const all = text(h);
  const claim = all.match(neverClaim);
  if (claim) errors.push(`${r}: claim we may not make -> "${claim[0]}"`);
  const price = all.match(perSquare);
  if (price) errors.push(`${r}: per-square price shown -> "${price[0]}"`);
  if (/-il$/.test(r)) {
    ilPages++;
    const start = h.indexOf('<section class="relative isolate');
    const end = h.lastIndexOf("<footer");
    const body = h.slice(start, end);
    const hit = text(body).replace(allowed, "").match(banned);
    if (hit) errors.push(`${r}: Illinois page offers roofing -> "${hit[0]}"`);
    if (/<option[^>]*>Roof (Repair|Replacement)<\/option>/.test(body)) errors.push(`${r}: Illinois lead form offers roofing`);
    if (/BEI Certified/.test(body)) errors.push(`${r}: roofing certification banner on Illinois page`);
    if (r.includes("/services/") && /roof-(repair|replacement)|storm-damage/.test(r)) errors.push(`${r}: roofing service URL for Illinois`);
  }
}

const home = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const checks = {
  "homepage estimator slider": /type="range"[^>]*min="10"[^>]*max="40"|min="10" max="40"/.test(home),
  "homepage cost section": home.includes('id="cost-fallback"'),
  "at least 30 Illinois pages scanned": ilPages >= 30,
};
for (const [k, ok] of Object.entries(checks)) if (!ok) errors.push(`check failed: ${k}`);

console.log(`scanned ${pages} pages, ${ilPages} Illinois pages`);
for (const [k, ok] of Object.entries(checks)) console.log(`${ok ? "PASS" : "FAIL"} ${k}`);
for (const e of errors) console.log("ERROR " + e);
if (errors.length) {
  console.log(`${errors.length} ERRORS`);
  process.exit(1);
}
console.log("COMPLIANCE: ALL CHECKS PASSED");
