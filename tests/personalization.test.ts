import test from "node:test";
import assert from "node:assert/strict";
import { resolvePersonalization } from "../src/lib/personalization";
import { defaultContent, validateContent } from "../src/lib/content";
import type { Listing } from "../src/lib/catalog";
const item: Listing = { id: "a", title: "Gift", description: "Gift", price: 20, category: "Gifts", image: "/demo/gift-0.svg", published: true };
const content = { ...defaultContent, defaultPersonalizationId: "free", personalizations: [{ id: "free", name: "Free engraving", heading: "Your message", text: "Enter engraving text" }, { id: "paid", name: "Premium", heading: "Premium engraving", text: "Enter text", price: 5 }] };
test("older settings without a personalization library remain usable", () => {
  const legacy = { ...content, personalizations: undefined } as unknown as typeof content;
  assert.equal(resolvePersonalization(item, legacy).personalizationEnabled, false);
});
test("shop default, selected library template, custom and disabled options resolve independently", () => {
  assert.equal(resolvePersonalization(item, content).personalizationHeading, "Your message");
  assert.equal(resolvePersonalization(item, content).personalizationPrice, undefined);
  assert.equal(resolvePersonalization({ ...item, personalizationMode: "template", personalizationTemplateId: "paid" }, content).personalizationPrice, 5);
  assert.equal(resolvePersonalization({ ...item, personalizationMode: "custom", personalizationHeading: "Custom" }, content).personalizationHeading, "Custom");
  assert.equal(resolvePersonalization({ ...item, personalizationMode: "none" }, content).personalizationEnabled, false);
  assert.equal(resolvePersonalization({ ...item, personalizationMode: "template", personalizationTemplateId: "removed" }, content).personalizationEnabled, false);
});
test("personalization library rejects invalid pricing and missing default references", () => {
  assert.doesNotThrow(() => validateContent(content));
  assert.throws(() => validateContent({ ...content, defaultPersonalizationId: "missing" }));
  assert.throws(() => validateContent({ ...content, personalizations: [{ ...content.personalizations[0], price: -1 }] }));
});
