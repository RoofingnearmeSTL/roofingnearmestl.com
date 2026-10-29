// Estimator math: the owner's published numbers. Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { estimate, priceRange, clampSquares } from "../src/lib/pricing.ts";

test("30-year architectural is $450-$750 per square", () => {
  assert.deepEqual(priceRange(12, "architectural"), { low: 5400, high: 9000 });
  assert.deepEqual(priceRange(18, "architectural"), { low: 8100, high: 13500 });
  assert.deepEqual(priceRange(24, "architectural"), { low: 10800, high: 18000 });
});

test("3-tab is $350-$550 per square", () => {
  assert.deepEqual(priceRange(12, "3tab"), { low: 4200, high: 6600 });
});

test("pitch picks low end, middle or high end", () => {
  assert.equal(estimate(18, "architectural", "steep").price, 13500);
  assert.equal(estimate(18, "architectural", "low").price, 8100);
  assert.equal(estimate(18, "architectural", "medium").price, 10800);
  assert.equal(estimate(18, "3tab", "low").price, 6300);
  assert.equal(estimate(12, "architectural", "medium").price, 7200);
  assert.equal(estimate(24, "architectural", "medium").price, 14400);
});

test("clay, metal and slate are custom quotes with no price", () => {
  for (const material of ["clay", "metal", "slate"]) assert.equal(estimate(18, material, "medium"), null);
});

test("roof size stays on the 10-40 SQ slider", () => {
  assert.equal(clampSquares(4), 10);
  assert.equal(clampSquares(55), 40);
  assert.equal(clampSquares(17.6), 18);
});

test('the site shows whole-roof totals only, never per-square rates', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const files = []
  const walk = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|md)$/.test(f)) files.push(p) } }
  walk('src')
  for (const file of files) {
    if (file.replace(/\\/g, '/').endsWith('src/lib/pricing.ts')) continue
    const text = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /per square(?! f)|\}\/SQ|\$\d[\d,]*\/SQ|Premium from/i, file)
  }
})
