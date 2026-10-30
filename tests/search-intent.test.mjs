// One page per search (#20): sibling pages must not target the same search.
// Rules: Brain-Data docs/playbooks/local-pages.md. Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("storm damage town pages don't use 'Repair' in their title (the roof repair page owns repair searches)", () => {
  const grid = read("src/lib/service-grid.ts");
  const storm = grid.slice(grid.indexOf('key: "storm-damage"'), grid.indexOf("h1:", grid.indexOf('key: "storm-damage"')));
  const titleLine = storm.split("\n").find((line) => line.trim().startsWith("title:"));
  assert.ok(titleLine, "storm title found");
  assert.ok(!/repair/i.test(titleLine), `storm title says repair: ${titleLine}`);
});

test("cost searches have one page: the old Missouri cost question redirects to the cost guide", () => {
  assert.ok(!read("src/lib/questions.ts").includes("how-much-does-a-new-roof-cost-in-missouri"));
  assert.match(read("next.config.ts"), /source: "\/questions\/how-much-does-a-new-roof-cost-in-missouri", destination: "\/blog\/roof-replacement-cost-st-louis-mo", permanent: true/);
  assert.ok(read("src/app/blog/roof-replacement-cost-st-louis-mo/page.tsx").includes("How much does a new roof cost in Missouri?"), "the guide keeps the question in its FAQ");
});

test("sitemap doesn't stamp every page with the build time", () => {
  assert.ok(!/lastModified/.test(read("src/app/sitemap.ts").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n")));
});
