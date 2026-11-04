import type { Project } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  toFilteredProjects,
  toNextGridIndex,
  toSortedProjects,
  isThumbnailPending,
} from "./features/home/index.js";

function project(
  id: string,
  name: string,
  createdAt: number,
  updatedAt: number,
  head: string | null = null,
  thumb: string | null = null
): Project {
  return {
    id,
    name,
    kind: "html",
    createdAt,
    updatedAt,
    imported: null,
    entry: "index.html",
    settings: {} as Project["settings"],
    directions: [
      {
        id: "main",
        name: "Main",
        workTree: "/x",
        branch: "d/main",
        headVersionId: head,
        parentVersionId: null,
        sessionId: null,
        createdAt,
      },
    ],
    thumbnail: thumb ? { versionId: thumb, at: 1 } : null,
  };
}

const list = [
  project("a", "Zebra page", 1, 30),
  project("b", "apple dashboard", 3, 10),
  project("c", "Café landing", 2, 20),
];

describe("project list", () => {
  it("sorts by recent, name and created", () => {
    expect(toSortedProjects(list, "recent").map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(toSortedProjects(list, "name").map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(toSortedProjects(list, "created").map((item) => item.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("filters by every word, ignoring case and accents", () => {
    expect(toFilteredProjects(list, "cafe").map((item) => item.id)).toEqual([
      "c",
    ]);
    expect(toFilteredProjects(list, "PAGE zeb").map((item) => item.id)).toEqual(
      ["a"]
    );
    expect(toFilteredProjects(list, "  ")).toHaveLength(3);
  });

  it("filters 50 projects in well under 50 ms", () => {
    const many = Array.from({ length: 50 }, (_, index) =>
      project(`p${index}`, `Project ${index} landing page`, index, index)
    );
    const started = performance.now();
    const shown = toFilteredProjects(many, "lan 4");
    expect(performance.now() - started).toBeLessThan(50);
    expect(shown.length).toBeGreaterThan(0);
  });

  it("knows when a thumbnail is behind the head", () => {
    expect(isThumbnailPending(project("a", "A", 1, 1, null))).toBe(false);
    expect(isThumbnailPending(project("a", "A", 1, 1, "v2", "v1"))).toBe(true);
    expect(isThumbnailPending(project("a", "A", 1, 1, "v2", "v2"))).toBe(false);
  });

  it("moves through the grid with arrow keys", () => {
    expect(toNextGridIndex("ArrowRight", 0, 5, 3)).toBe(1);
    expect(toNextGridIndex("ArrowRight", 4, 5, 3)).toBe(4);
    expect(toNextGridIndex("ArrowDown", 1, 5, 3)).toBe(4);
    expect(toNextGridIndex("ArrowDown", 2, 5, 3)).toBe(2);
    expect(toNextGridIndex("ArrowUp", 4, 5, 3)).toBe(1);
    expect(toNextGridIndex("End", 0, 5, 3)).toBe(4);
    expect(toNextGridIndex("Tab", 0, 5, 3)).toBeNull();
  });
});
