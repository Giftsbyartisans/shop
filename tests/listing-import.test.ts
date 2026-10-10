import assert from "node:assert/strict";
import test from "node:test";
import { parseCSV, importListings } from "../src/lib/listing-import";

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
test("invalid rows and duplicate IDs are rejected before importing", () => {
  assert.throws(
    () => importListings("TITLE,DESCRIPTION,PRICE\nGift,Gift,-1", "bad.csv"),
    /valid price/,
  );
  assert.throws(
    () =>
      importListings(
        JSON.stringify([
          { id: "g", title: "Gift", description: "Gift", price: 12 },
          { id: "g", title: "Gift", description: "Gift", price: 12 },
        ]),
        "bad.json",
      ),
    /Duplicate/,
  );
  assert.throws(() => parseCSV('TITLE\n"unclosed'), /unclosed/);
});

test("only the first ten listings are imported", () => {
  const records = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    title: `Gift ${i}`,
    description: "Handmade gift",
    price: 10,
  }));
  const imported = importListings(JSON.stringify(records), "catalog.json");
  assert.equal(imported.length, 10);
  assert.equal(imported[9].id, "9");
});
