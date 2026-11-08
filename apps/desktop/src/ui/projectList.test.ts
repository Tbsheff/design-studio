import type { Project } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  toFilteredProjects,
  toNextGridIndex,
  toSortedProjects,
  isThumbnailPending,
} from "./features/home/index.js";

const EXPECTED_3 = 3;
const EXPECTED_4 = 4;
const EXPECTED_50 = 50;
const PROJECT_ARG_10 = 10;
const PROJECT_ARG_20 = 20;
const PROJECT_ARG_3 = 3;
const PROJECT_ARG_30 = 30;
const TO_NEXT_GRID_INDEX_ARG_3 = 3;
const TO_NEXT_GRID_INDEX_ARG_4 = 4;
const TO_NEXT_GRID_INDEX_ARG_5 = 5;

const IS_FALSE = false;
const IS_TRUE = true;

function project(
  id: string,
  name: string,
  createdAt: number,
  updatedAt: number,
  head: string | null = null,
  thumb: string | null = null
): Project {
  return {
    createdAt,
    directions: [
      {
        branch: "d/main",
        createdAt,
        headVersionId: head,
        id: "main",
        name: "Main",
        parentVersionId: null,
        sessionId: null,
        workTree: "/x",
      },
    ],
    entry: "index.html",
    id,
    imported: null,
    kind: "html",
    name,
    settings: {} as Project["settings"],
    thumbnail: thumb ? { at: 1, versionId: thumb } : null,
    updatedAt,
  };
}

const list = [
  project("a", "Zebra page", 1, PROJECT_ARG_30),
  project("b", "apple dashboard", PROJECT_ARG_3, PROJECT_ARG_10),
  project("c", "Café landing", 2, PROJECT_ARG_20),
];

describe("project list", () => {
  it("sorts by recent, name and created", () => {
    expect.hasAssertions();

    expect(
      toSortedProjects(list, "recent").map((item) => item.id)
    ).toStrictEqual(["a", "c", "b"]);
    expect(toSortedProjects(list, "name").map((item) => item.id)).toStrictEqual(
      ["b", "c", "a"]
    );
    expect(
      toSortedProjects(list, "created").map((item) => item.id)
    ).toStrictEqual(["b", "c", "a"]);
  }, 0);

  it("filters by every word, ignoring case and accents", () => {
    expect.hasAssertions();

    expect(
      toFilteredProjects(list, "cafe").map((item) => item.id)
    ).toStrictEqual(["c"]);
    expect(
      toFilteredProjects(list, "PAGE zeb").map((item) => item.id)
    ).toStrictEqual(["a"]);
    expect(toFilteredProjects(list, "  ")).toHaveLength(EXPECTED_3);
  }, 0);

  it("filters 50 projects in well under 50 ms", () => {
    expect.hasAssertions();

    const many = Array.from({ length: 50 }, (_unusedItem, index) =>
      project(`p${index}`, `Project ${index} landing page`, index, index)
    );

    const started = performance.now();
    const shown = toFilteredProjects(many, "lan 4");
    expect(performance.now() - started).toBeLessThan(EXPECTED_50);
    expect(shown.length).toBeGreaterThan(0);
  }, 0);
});

describe("project thumbnails", () => {
  it("knows when a thumbnail is behind the head", () => {
    expect.hasAssertions();

    expect(isThumbnailPending(project("a", "A", 1, 1, null))).toBe(IS_FALSE);
    expect(isThumbnailPending(project("a", "A", 1, 1, "v2", "v1"))).toBe(
      IS_TRUE
    );
    expect(isThumbnailPending(project("a", "A", 1, 1, "v2", "v2"))).toBe(
      IS_FALSE
    );
  }, 0);
});

describe("project grid", () => {
  it("moves through the grid with arrow keys", () => {
    expect.hasAssertions();

    expect(
      toNextGridIndex(
        "ArrowRight",
        0,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(1);
    expect(
      toNextGridIndex(
        "ArrowRight",
        TO_NEXT_GRID_INDEX_ARG_4,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(EXPECTED_4);
    expect(
      toNextGridIndex(
        "ArrowDown",
        1,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(EXPECTED_4);
    expect(
      toNextGridIndex(
        "ArrowDown",
        2,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(2);
    expect(
      toNextGridIndex(
        "ArrowUp",
        TO_NEXT_GRID_INDEX_ARG_4,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(1);
    expect(
      toNextGridIndex(
        "End",
        0,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBe(EXPECTED_4);
    expect(
      toNextGridIndex(
        "Tab",
        0,
        TO_NEXT_GRID_INDEX_ARG_5,
        TO_NEXT_GRID_INDEX_ARG_3
      )
    ).toBeNull();
  }, 0);
});
