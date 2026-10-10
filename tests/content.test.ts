import assert from "node:assert/strict";
import test from "node:test";
import { defaultContent, validateContent } from "../src/lib/content";

test("default website settings and durable uploaded image paths are accepted", () => {
  const content = structuredClone(defaultContent);
  content.logo = "s3:media/logo.png";
  content.favicon = "https://example.com/icon.png";
  content.reviews = [
    { id: "review", name: "Customer", text: "Lovely gift.", rating: 5 },
  ];
  assert.doesNotThrow(() => validateContent(content));
});

test("sale rejects invalid discounts", () => {
  for (const salePercent of [-1, 100, NaN, Infinity]) {
    assert.throws(
      () =>
        validateContent({ ...structuredClone(defaultContent), salePercent }),
      /Discount/,
    );
  }
});

test("unsafe image and social URL schemes cannot be published", () => {
  for (const logo of [
    "javascript:alert(1)",
    "http://example.com/logo.png",
    "data:image/png;base64,abc",
  ]) {
    assert.throws(
      () => validateContent({ ...structuredClone(defaultContent), logo }),
      /Images/,
    );
  }
  assert.throws(
    () =>
      validateContent({
        ...structuredClone(defaultContent),
        instagram: "javascript:alert(1)",
      }),
    /Social/,
  );
});

test("incomplete categories, reviews, and policy headings cannot be published", () => {
  assert.throws(
    () =>
      validateContent({
        ...structuredClone(defaultContent),
        categories: [{ id: "c", name: " ", image: "" }],
      }),
    /category/,
  );
  assert.throws(
    () =>
      validateContent({
        ...structuredClone(defaultContent),
        reviews: [{ id: "r", name: "Customer", text: "Lovely", rating: 6 }],
      }),
    /testimonial/,
  );
  assert.throws(
    () =>
      validateContent({
        ...structuredClone(defaultContent),
        policies: [{ id: "p", title: " ", text: "Text" }],
      }),
    /policy/,
  );
});
