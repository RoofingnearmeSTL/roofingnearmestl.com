// Review proof on city pages (#20): real reviews only, word for word, right town, no roofing in Illinois.
// Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { publicTown, quoteFor, reviews, reviewsForCity } from "../src/lib/reviews.ts";

test("every excerpt is copied word for word from its review", () => {
  for (const review of reviews) {
    if (review.excerpt) assert.ok(review.text.includes(review.excerpt), `excerpt not in review by ${review.author}`);
  }
});

test("quotes only add … where text was cut", () => {
  const mason = reviews.find((review) => review.author === "Mason Tinker");
  assert.ok(quoteFor(mason).startsWith("…") && !quoteFor(mason).endsWith("…"), "Mason's excerpt runs to the end of the review");
  for (const review of reviews) assert.ok(review.text.includes(quoteFor(review).replace(/^…|…$/g, "")));
});

test("Illinois city pages never show roofing reviews", () => {
  for (const city of ["Waterloo", "Dupo", "Columbia", "Belleville"]) {
    for (const { review } of reviewsForCity(city, "IL")) assert.equal(review.work, "exterior");
  }
});

test("a roof job in Illinois never shows its town", () => {
  for (const review of reviews) {
    if (review.work === "roofing" && review.town?.state === "IL") assert.equal(publicTown(review), null);
  }
});

test("reviews are only marked local for the town they name", () => {
  for (const city of ["Arnold", "St. Charles", "Kirkwood", "Festus"]) {
    for (const { review, local } of reviewsForCity(city, "MO")) {
      if (local) assert.equal(review.town?.city, city);
      const town = publicTown(review);
      if (town) assert.equal(town, `${review.town.city}, ${review.town.state}`);
    }
  }
  // A town named in a review moves it to the top of that town's page.
  const sample = [{ ...reviews[2], town: undefined }, { ...reviews[1], town: { city: "Arnold", state: "MO", from: "review" } }];
  const arnold = reviewsForCity("Arnold", "MO", sample);
  assert.equal(arnold[0].local, true);
  assert.equal(arnold[1].local, false);
});

test("city reviews carry no review schema markup (#23)", () => {
  const source = fs.readFileSync(new URL("../src/components/city-reviews.tsx", import.meta.url), "utf8");
  assert.ok(!/application\/ld\+json|aggregateRating|"Review"/.test(source));
});
