import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSitemap } from "../src/lib/sitemap";
import type { Listing } from "../src/lib/catalog";

test("sitemap includes published products and encoded categories, omitting drafts and duplicates", () => {
  const item: Listing = { id: "copper-1", title: "Bottle", category: "Copper Bottle", description: "", image: "", price: 10, published: true };
  const urls = buildSitemap("https://example.com/", [item, item, { ...item, id: "draft", published: false, category: "Hidden" }]).map(entry => entry.url);
  assert.equal(urls.length, 7);
  assert.ok(urls.includes("https://example.com/collection/Copper%20Bottle"));
  assert.ok(urls.includes("https://example.com/listing/copper-1/bottle"));
  assert.ok(urls.every(url => !url.includes("draft") && !url.includes("Hidden") && !url.includes("admin")));
});
