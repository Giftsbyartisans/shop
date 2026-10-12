import { test } from "node:test";
import assert from "node:assert/strict";
import { categoryRenames } from "../src/lib/category-renames";

test("category renames track stable IDs without treating removal or reordering as renames", () => {
  const previous = [{ id: "a", name: "Pitchers", image: "" }, { id: "b", name: "Bowls", image: "" }, { id: "c", name: "Removed", image: "" }];
  const next = [{ id: "b", name: "Bowls", image: "" }, { id: "a", name: "Copper Pitchers", image: "" }, { id: "d", name: "New", image: "" }];
  assert.deepEqual([...categoryRenames(previous, next)], [["Pitchers", "Copper Pitchers"]]);
});
