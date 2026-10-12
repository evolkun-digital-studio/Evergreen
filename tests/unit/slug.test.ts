import { describe, expect, it } from "vitest";
import { isValidSlug, slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, hyphenates and strips punctuation", () => {
    expect(slugify("EPR Compliance: A Complete Guide for 2025!")).toBe("epr-compliance-a-complete-guide-for-2025");
  });
  it("transliterates accents and ampersands", () => {
    expect(slugify("Café & Résumé")).toBe("cafe-and-resume");
  });
  it("drops apostrophes instead of splitting words", () => {
    expect(slugify("India's E-Waste Rules")).toBe("indias-e-waste-rules");
  });
  it("optionally removes stop words but never empties the slug", () => {
    expect(slugify("What is the EPR for a PIBO", { removeStopWords: true })).toBe("epr-pibo");
    expect(slugify("The And Of", { removeStopWords: true })).toBe("the-and-of");
  });
  it("truncates on a word boundary", () => {
    const slug = slugify("plastic waste management rules amendment notified by the ministry", { maxLength: 30 });
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toBe("plastic-waste-management-rules");
  });
  it("returns empty for symbol-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("isValidSlug", () => {
  it.each([
    ["epr-guide", true],
    ["epr--guide", false],
    ["-epr", false],
    ["EPR", false],
    ["epr_guide", false],
  ])("%s -> %s", (slug, ok) => expect(isValidSlug(slug)).toBe(ok));
});

describe("uniqueSlug", () => {
  it("appends a counter until free", async () => {
    const taken = new Set(["guide", "guide-2"]);
    expect(await uniqueSlug("guide", async (s) => taken.has(s))).toBe("guide-3");
  });
});
