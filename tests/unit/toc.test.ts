import { describe, expect, it } from "vitest";
import { buildTocTree, extractHeadings } from "@/lib/content/toc";
import type { PMNode } from "@/lib/content/types";

const h = (level: number, text: string): PMNode => ({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
const doc = (...content: PMNode[]): PMNode => ({ type: "doc", content });

describe("extractHeadings", () => {
  it("collects H2–H4 with slug ids, de-duplicated", () => {
    const headings = extractHeadings(doc(h(2, "What is EPR?"), h(3, "Targets"), h(2, "Targets"), h(4, "Targets")));
    expect(headings.map((x) => x.id)).toEqual(["what-is-epr", "targets", "targets-2", "targets-3"]);
  });
  it("clamps H1/H5/H6 into range and skips empty headings", () => {
    const headings = extractHeadings(doc(h(1, "Top"), h(6, "Deep"), { type: "heading", attrs: { level: 2 } }));
    expect(headings.map((x) => x.level)).toEqual([2, 4]);
  });
  it("finds headings nested in callouts", () => {
    expect(extractHeadings(doc({ type: "callout", content: [h(3, "Inside")] }))[0].text).toBe("Inside");
  });
});

describe("buildTocTree", () => {
  it("nests by level and tolerates skipped levels", () => {
    const tree = buildTocTree(extractHeadings(doc(h(2, "A"), h(3, "A1"), h(4, "A1a"), h(2, "B"), h(4, "B-deep"))));
    expect(tree.map((t) => t.text)).toEqual(["A", "B"]);
    expect(tree[0].children[0].children[0].text).toBe("A1a");
    expect(tree[1].children[0].text).toBe("B-deep");
  });
});
