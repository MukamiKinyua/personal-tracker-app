import { describe, expect, it } from "vitest";
import {
  addLink,
  canLink,
  createLink,
  ENTITY_LABEL,
  linkedOfKind,
  linksFor,
  LINK_MATRIX,
  pruneLinks,
  removeLink,
  type EntityKind,
} from "./links";

describe("the relationship matrix", () => {
  it("allows the connections section 6 lists", () => {
    expect(canLink("task", "goal")).toBe(true);
    expect(canLink("focus-session", "assignment")).toBe(true);
    expect(canLink("expense", "recurring-bill")).toBe(true);
    expect(canLink("learning-session", "skill")).toBe(true);
    expect(canLink("sleep", "wellbeing")).toBe(true);
  });

  it("reads a link the same way from either end", () => {
    expect(canLink("goal", "task")).toBe(canLink("task", "goal"));
    expect(canLink("course", "assignment")).toBe(true);
    expect(canLink("assignment", "course")).toBe(true);
  });

  it("refuses a connection that would mean nothing", () => {
    expect(canLink("water", "recurring-bill")).toBe(false);
    expect(() => createLink("water", "w1", "recurring-bill", "b1")).toThrow(
      /cannot be linked/
    );
  });

  it("names every entity kind it can link", () => {
    for (const kind of Object.keys(LINK_MATRIX) as EntityKind[]) {
      expect(ENTITY_LABEL[kind]).toBeTruthy();
    }
  });
});

describe("following links", () => {
  const links = [
    createLink("task", "t1", "goal", "g1"),
    createLink("task", "t2", "goal", "g1"),
    createLink("focus-session", "f1", "task", "t1"),
  ];

  it("finds connections in both directions", () => {
    expect(linksFor(links, "goal", "g1")).toEqual([
      { kind: "task", id: "t1" },
      { kind: "task", id: "t2" },
    ]);
    expect(linksFor(links, "task", "t1")).toEqual([
      { kind: "goal", id: "g1" },
      { kind: "focus-session", id: "f1" },
    ]);
  });

  it("filters to one kind", () => {
    expect(linkedOfKind(links, "task", "t1", "focus-session")).toEqual(["f1"]);
    expect(linkedOfKind(links, "task", "t1", "goal")).toEqual(["g1"]);
  });

  it("does not store the same connection twice, whichever way it is added", () => {
    let stored = addLink([], createLink("task", "t1", "goal", "g1"));
    stored = addLink(stored, createLink("goal", "g1", "task", "t1"));
    expect(stored).toHaveLength(1);
  });

  it("removes a connection from either side", () => {
    const stored = addLink([], createLink("task", "t1", "goal", "g1"));
    expect(removeLink(stored, createLink("goal", "g1", "task", "t1"))).toEqual(
      []
    );
  });

  it("drops every link to a permanently deleted record", () => {
    expect(pruneLinks(links, "task", "t1")).toEqual([links[1]]);
  });
});
