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

interface ProjectVersions {
  readonly head: string | null;
  readonly thumb: string | null;
}

const NO_VERSIONS: ProjectVersions = { head: null, thumb: null };

const toThumbnail = (versionId: string | null): Project["thumbnail"] => {
  if (versionId === null || versionId === "") {
    return null;
  }

  return { at: 1, versionId };
};

const project = (
  projectId: string,
  projectName: string,
  stamps: readonly [number, number],
  versions: ProjectVersions
): Project => ({
  createdAt: stamps[0],
  directions: [
    {
      branch: "d/main",
      createdAt: stamps[0],
      headVersionId: versions.head,
      id: "main",
      name: "Main",
      parentVersionId: null,
      sessionId: null,
      workTree: "/x",
    },
  ],
  entry: "index.html",
  id: projectId,
  imported: null,
  kind: "html",
  name: projectName,
  settings: {} as Project["settings"],
  thumbnail: toThumbnail(versions.thumb),
  updatedAt: stamps[1],
});

const toIndex = (key: string, from: number): number | null =>
  toNextGridIndex(
    key,
    from,
    TO_NEXT_GRID_INDEX_ARG_5,
    TO_NEXT_GRID_INDEX_ARG_3
  );

const list = [
  project("a", "Zebra page", [1, PROJECT_ARG_30], NO_VERSIONS),
  project("b", "apple dashboard", [PROJECT_ARG_3, PROJECT_ARG_10], NO_VERSIONS),
  project("c", "Café landing", [2, PROJECT_ARG_20], NO_VERSIONS),
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
      project(
        `p${index}`,
        `Project ${index} landing page`,
        [index, index],
        NO_VERSIONS
      )
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

    expect(isThumbnailPending(project("a", "A", [1, 1], NO_VERSIONS))).toBe(
      IS_FALSE
    );
    expect(
      isThumbnailPending(project("a", "A", [1, 1], { head: "v2", thumb: "v1" }))
    ).toBe(IS_TRUE);
    expect(
      isThumbnailPending(project("a", "A", [1, 1], { head: "v2", thumb: "v2" }))
    ).toBe(IS_FALSE);
  }, 0);
});

describe("project grid", () => {
  it("moves through the grid with arrow keys", () => {
    expect.hasAssertions();

    expect([
      toIndex("ArrowRight", 0),
      toIndex("ArrowRight", TO_NEXT_GRID_INDEX_ARG_4),
      toIndex("ArrowDown", 1),
      toIndex("ArrowDown", 2),
    ]).toStrictEqual([1, EXPECTED_4, EXPECTED_4, 2]);
    expect([
      toIndex("ArrowUp", TO_NEXT_GRID_INDEX_ARG_4),
      toIndex("End", 0),
      toIndex("Tab", 0),
    ]).toStrictEqual([1, EXPECTED_4, null]);
  }, 0);
});
