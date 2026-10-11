import assert from "node:assert/strict";
import test from "node:test";
import { parseCSV, importListings } from "../src/lib/listing-import";
import { mediaUploadPrefix } from "../src/lib/media-paths";

test("CSV handles commas, escaped quotes, and multiline descriptions", () => {
  const rows = parseCSV(
    'TITLE,DESCRIPTION,PRICE\r\n"Gift, box","A ""special"" gift\nfor you",25',
  );
  assert.deepEqual(rows, [
    ["TITLE", "DESCRIPTION", "PRICE"],
    ["Gift, box", 'A "special" gift\nfor you', "25"],
  ]);
});
test("Etsy-style CSV imports image and price as a draft", () => {
  const [item] = importListings(
    "TITLE,DESCRIPTION,PRICE,IMAGE1\nGift,Handmade gift,25.50,https://example.com/gift.jpg",
    "etsy.csv",
  );
  assert.equal(item.price, 25.5);
  assert.equal(item.published, false);
  assert.equal(item.image, "https://example.com/gift.jpg");
});
test("JSON preserves IDs and published status", () => {
  const [item] = importListings(
    JSON.stringify([
      {
        id: "gift",
        title: "Gift",
        description: "A gift",
        price: 12,
        image: "/demo/gift-0.svg",
        published: true,
      },
    ]),
    "export.json",
  );
  assert.equal(item.id, "gift");
  assert.equal(item.published, true);
});
test("imported listings with missing or blank IDs get a unique UUID", () => {
  for (const id of [undefined, "   "]) {
    const [item] = importListings(
      JSON.stringify([
        {
          ...(id === undefined ? {} : { id }),
          title: "Gift",
          description: "A gift",
          price: 12,
        },
      ]),
      "gift.json",
    );
    assert.match(
      item.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  }
});
test("listing ID is shared by its uploaded photo and video folders", () => {
  const [item] = importListings(
    JSON.stringify([
      {
        title: "Gift",
        description: "A gift",
        price: 12,
      },
    ]),
    "gift.json",
  );
  const imageFolder = mediaUploadPrefix(
    { kind: "listing-images", name: item.title, entityId: item.id },
    "front.jpg",
    crypto.randomUUID(),
  );
  const videoFolder = mediaUploadPrefix(
    { kind: "listing-videos", name: item.title, entityId: item.id },
    "detail.mp4",
    crypto.randomUUID(),
  );
  assert.ok(imageFolder.includes(item.id));
  assert.ok(videoFolder.includes(item.id));
});
test("an invalid first listing is rejected before importing", () => {
  assert.throws(
    () => importListings("TITLE,DESCRIPTION,PRICE\nGift,Gift,-1", "bad.csv"),
    /valid price/,
  );
  assert.throws(() => parseCSV('TITLE\n"unclosed'), /unclosed/);
});

test("all listings are imported with no listing-count limit", () => {
  const records = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    title: `Gift ${i}`,
    description: "Handmade gift",
    price: 10,
  }));
  const imported = importListings(JSON.stringify(records), "catalog.json");
  assert.equal(imported.length, records.length);
  assert.equal(imported.at(-1)?.id, "14");
});
