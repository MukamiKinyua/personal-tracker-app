import { describe, expect, it } from "vitest";
import {
  groupHits,
  highlight,
  queryTerms,
  search,
  type SearchDoc,
} from "./search";

const docs: SearchDoc[] = [
  { id: "1", scope: "task", title: "Draft chapter 3", day: "2026-03-14" },
  { id: "2", scope: "task", title: "Chapter review notes", day: "2026-03-10" },
  {
    id: "3",
    scope: "reflection",
    title: "Week of 9 March",
    body: "A hard week, but the chapter draft finally moved.",
    day: "2026-03-09",
  },
  { id: "4", scope: "finances", title: "Café Riva", day: "2026-03-12" },
  { id: "5", scope: "habit", title: "Stretch before bed", day: "2026-03-14" },
];

describe("query parsing", () => {
  it("splits on whitespace and drops empties", () => {
    expect(queryTerms("  draft   chapter ")).toEqual(["draft", "chapter"]);
  });

  it("returns nothing for an empty query", () => {
    expect(queryTerms("   ")).toEqual([]);
    expect(search("   ", docs)).toEqual([]);
  });
});

describe("finding things", () => {
  it("ranks every title match above a body match", () => {
    const ids = search("chapter", docs).map(h => h.id);
    // Docs 1 and 2 match in the title; doc 3 only in its body.
    expect(ids).toContain("3");
    expect(ids.indexOf("1")).toBeLessThan(ids.indexOf("3"));
    expect(ids.indexOf("2")).toBeLessThan(ids.indexOf("3"));
  });

  it("prefers a match at the start of the title", () => {
    const hits = search("chapter", docs);
    // "Chapter review notes" starts with the term; "Draft chapter 3" does not.
    const ids = hits.map(h => h.id);
    expect(ids.indexOf("2")).toBeLessThan(ids.indexOf("3"));
  });

  it("requires every term to match", () => {
    // Doc 3's body carries both "draft" and "chapter", so it matches too.
    expect(
      search("draft chapter", docs)
        .map(h => h.id)
        .sort()
    ).toEqual(["1", "3"]);
    // "3" appears only in doc 1's title, narrowing it to one result.
    expect(search("draft 3", docs).map(h => h.id)).toEqual(["1"]);
    expect(search("draft unicorn", docs)).toEqual([]);
  });

  it("is case insensitive and ignores accents", () => {
    expect(search("cafe", docs).map(h => h.id)).toEqual(["4"]);
    expect(search("CAFÉ", docs).map(h => h.id)).toEqual(["4"]);
  });

  it("can be limited to certain chapters", () => {
    expect(
      search("chapter", docs, { scopes: ["reflection"] }).map(h => h.id)
    ).toEqual(["3"]);
  });

  it("searches everything when no scope filter is given", () => {
    expect(search("chapter", docs, { scopes: [] }).length).toBeGreaterThan(1);
  });

  it("honours the result limit", () => {
    expect(search("chapter", docs, { limit: 1 })).toHaveLength(1);
  });

  it("breaks a tie towards the more recent record", () => {
    const sameScore: SearchDoc[] = [
      { id: "old", scope: "task", title: "Report", day: "2026-01-01" },
      { id: "new", scope: "task", title: "Report", day: "2026-03-14" },
    ];
    expect(search("report", sameScore).map(h => h.id)).toEqual(["new", "old"]);
  });
});

describe("grouping and highlighting", () => {
  it("groups results under their chapter, best scope first", () => {
    const groups = groupHits(search("chapter", docs));
    expect(groups[0].scope).toBe("task");
    expect(groups.map(g => g.scope)).toContain("reflection");
  });

  it("splits a title into matched and unmatched parts", () => {
    const [hit] = search("chapter", docs, { scopes: ["task"], limit: 1 });
    const parts = highlight(hit.title, hit.matches);
    expect(parts.map(p => p.text).join("")).toBe(hit.title);
    expect(parts.some(p => p.matched)).toBe(true);
  });

  it("returns the whole title unmatched when there is nothing to highlight", () => {
    expect(highlight("Draft chapter 3", [])).toEqual([
      { text: "Draft chapter 3", matched: false },
    ]);
  });

  it("merges overlapping ranges rather than duplicating text", () => {
    const parts = highlight("chapters", [
      [0, 4],
      [2, 8],
    ]);
    expect(parts.map(p => p.text).join("")).toBe("chapters");
    expect(parts.filter(p => p.matched)).toHaveLength(1);
  });

  it("returns parts rather than markup, so a title can never inject HTML", () => {
    const parts = highlight("<b>bold</b> plan", [[0, 3]]);
    expect(parts.every(part => typeof part.text === "string")).toBe(true);
    expect(parts.map(p => p.text).join("")).toBe("<b>bold</b> plan");
  });
});
