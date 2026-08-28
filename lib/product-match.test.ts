import assert from "node:assert/strict";
import { test } from "node:test";
import {
  catalogActionFor,
  matchProduct,
  parseIdentity,
  sizesCompatible,
  type ProductCandidate,
} from "./product-match";

const surf1kg: ProductCandidate = {
  id: "p-surf-1kg",
  name: "Surf Excel Detergent 1KG",
};

const surf500g: ProductCandidate = {
  id: "p-surf-500g",
  name: "Surf Excel Detergent 500g",
};

const tataIodized: ProductCandidate = {
  id: "p-tata",
  name: "Tata Salt Iodized 1 KG",
};

test("parseIdentity: 1kg and 1 KG are the same size", () => {
  const a = parseIdentity("Surf Excel 1kg");
  const b = parseIdentity("Surf Excel Detergent 1KG");
  assert.equal(a.normalizedName, "surf excel");
  assert.equal(b.normalizedName, "surf excel");
  assert.ok(a.size);
  assert.ok(b.size);
  assert.equal(sizesCompatible(a.size, b.size), true);
});

test("Surf Excel 1kg matches Surf Excel Detergent 1KG at HIGH", () => {
  const result = matchProduct("Surf Excel 1kg", [surf1kg, surf500g]);
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.selectedProductId, "p-surf-1kg");
  assert.equal(catalogActionFor(result), "UPDATE");
});

test("Surf Excel 1kg does not attach to Surf Excel 500g", () => {
  const result = matchProduct("Surf Excel 1kg", [surf500g]);
  assert.equal(result.confidence, "NONE");
  assert.equal(result.selectedProductId, null);
  assert.equal(result.candidates.length, 0);
  assert.equal(catalogActionFor(result), "CREATE");
});

test("two sizes of the same name never collapse", () => {
  const result = matchProduct("Surf Excel 1kg", [surf1kg, surf500g]);
  assert.equal(result.selectedProductId, "p-surf-1kg");
  assert.equal(
    result.candidates.some((c) => c.productId === "p-surf-500g"),
    false,
  );
});

test("Tata Salt 1kg vs Tata Salt Iodized 1 KG is HIGH or MEDIUM", () => {
  const result = matchProduct("Tata Salt 1kg", [tataIodized]);
  assert.ok(result.confidence === "HIGH" || result.confidence === "MEDIUM");
  if (result.confidence === "HIGH") {
    assert.equal(result.selectedProductId, "p-tata");
  } else {
    assert.equal(result.selectedProductId, null);
    assert.equal(result.candidates[0]?.productId, "p-tata");
  }
});

test("blank or junk OCR is NONE", () => {
  for (const text of ["", "   ", "???", "---", "..."]) {
    const result = matchProduct(text, [surf1kg]);
    assert.equal(result.confidence, "NONE", text);
    assert.equal(result.selectedProductId, null, text);
    assert.equal(catalogActionFor(result), "CREATE", text);
  }
});

test("empty product list (first catalog) → NONE, catalog action CREATE", () => {
  const result = matchProduct("Surf Excel 1kg", []);
  assert.equal(result.confidence, "NONE");
  assert.equal(result.selectedProductId, null);
  assert.equal(result.candidates.length, 0);
  assert.equal(catalogActionFor(result), "CREATE");
});

test("SKU exact match is HIGH even when names differ", () => {
  const result = matchProduct(
    "something messy from ocr",
    [{ id: "p-sku", name: "Official Name 1kg", sku: "SX-1KG" }],
    "sx-1kg",
  );
  assert.equal(result.confidence, "HIGH");
  assert.equal(result.selectedProductId, "p-sku");
  assert.equal(catalogActionFor(result), "UPDATE");
});

test("SKU match still respects size mismatch", () => {
  const result = matchProduct(
    "Surf Excel 1kg",
    [{ id: "p-wrong-size", name: "Surf Excel 500g", sku: "SX-500" }],
    "SX-500",
  );
  assert.equal(result.confidence, "NONE");
  assert.equal(result.selectedProductId, null);
});

test("MEDIUM does not pre-select and is UNCERTAIN for catalogs", () => {
  const distant: ProductCandidate = {
    id: "p-rin",
    name: "Rin Detergent Powder 1kg",
  };
  const result = matchProduct("Surf Excel 1kg", [distant]);
  assert.notEqual(result.confidence, "HIGH");
  assert.equal(result.selectedProductId, null);
  if (result.confidence === "MEDIUM") {
    assert.equal(catalogActionFor(result), "UNCERTAIN");
  } else {
    assert.equal(catalogActionFor(result), "CREATE");
  }
});
