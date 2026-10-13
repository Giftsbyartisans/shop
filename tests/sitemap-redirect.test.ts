import { test } from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/sitemap/route";

test("sitemap redirect stays on the public origin behind an internal proxy", () => {
  const response = GET();
  const location = response.headers.get("location");
  assert.equal(location, "/sitemap.xml");
  assert.equal(new URL(location!, "https://shop.example/sitemap").href, "https://shop.example/sitemap.xml");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
