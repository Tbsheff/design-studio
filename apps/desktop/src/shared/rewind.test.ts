import { describe, expect, it } from "vitest";

import { forkBaseOf, runMatches, runQueryTerms } from "./rewind";

const versions = [
  { createdAt: 300, id: "v3", parentId: "v2" },
  { createdAt: 200, id: "v2", parentId: "v1" },
  { createdAt: 100, id: "v1", parentId: null },
];

describe(forkBaseOf, () => {
  it("forks from the parent of the version the run made", () => {
    expect(forkBaseOf({ startedAt: 250, versionId: "v3" }, versions)).toBe(
      "v2"
    );
    expect(forkBaseOf({ startedAt: 50, versionId: "v1" }, versions)).toBeNull();
  });

  it("forks from the head at run start when the run made no version", () => {
    expect(forkBaseOf({ startedAt: 250, versionId: null }, versions)).toBe(
      "v2"
    );
    expect(forkBaseOf({ startedAt: 50, versionId: null }, versions)).toBeNull();
  });

  it("returns null for a version that is not in the list", () => {
    expect(
      forkBaseOf({ startedAt: 250, versionId: "other" }, versions)
    ).toBeNull();
  });
});

describe(runMatches, () => {
  it("matches every word in the prompt or title, any case", () => {
    expect(runMatches(runQueryTerms("MENU"), "Add a menu section")).toBe(true);
    expect(runMatches(runQueryTerms("menu hours"), "Add a menu section")).toBe(
      false
    );
    expect(
      runMatches(runQueryTerms("hero"), "Add a menu section", "Hero pass")
    ).toBe(true);
    expect(runMatches(runQueryTerms("  "), "anything")).toBe(true);
  });
});
