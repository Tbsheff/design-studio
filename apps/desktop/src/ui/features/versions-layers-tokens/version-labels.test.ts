import type { Version, VersionMeta } from "@design-studio/contracts";
import { describe, expect, it } from "vitest";

import {
  displayTitle,
  indexVersions,
  kindInfo,
  originOf,
  undoneOf,
} from "./version-labels.js";

const version = (
  id: string,
  title: string,
  meta: VersionMeta,
  parentId: string | null = null
): Version => ({
  changedFiles: [],
  createdAt: 0,
  directionId: "main",
  id,
  meta,
  parentId,
  title,
});

const run = version(
  "a",
  "A landing page for a small independent bookshop: hero, featured books, events calendar, n",
  {
    kind: "run",
    prompt:
      "A landing page for a small independent bookshop: hero, featured books, events calendar, newsletter signup",
  }
);

const edit = version("b", "Edit h1: color", { kind: "manual" }, "a");

const undo = version(
  "c",
  'Undo to "A landing page for a small independent bookshop: hero, featured books, events calendar, n"',
  { kind: "undo", restoredFrom: "a" },
  "b"
);

const tokens = version(
  "d",
  "Update tokens: --primary",
  { kind: "manual" },
  "c"
);

const undo2 = version(
  "e",
  'Undo to "Undo to "A landing page for a small independent bookshop: hero, featured books, events calendar, n""',
  { kind: "undo", restoredFrom: "c" },
  "d"
);

const index = indexVersions([run, edit, undo, tokens, undo2]);

describe("version labels", () => {
  it("shortens legacy run titles", () => {
    expect.hasAssertions();

    expect(displayTitle(run, index)).toBe(
      "A landing page for a small independent bookshop"
    );
  }, 0);

  it("resolves legacy nested undo titles through the chain", () => {
    expect.hasAssertions();

    expect(originOf(undo2, index)?.id).toBe("a");
    expect(displayTitle(undo2, index)).toBe(
      "Back to A landing page for a small independent bookshop"
    );
    expect(displayTitle(undo, index)).toBe(
      "Back to A landing page for a small independent bookshop"
    );
  }, 0);

  it("falls back to unwrapping when the target is not listed", () => {
    expect.hasAssertions();

    const orphan = version("f", 'Undo to "Undo to "Edit h1: color""', {
      kind: "undo",
      restoredFrom: "zzz",
    });

    expect(displayTitle(orphan, index)).toBe("Back to Edit h1: color");
  }, 0);

  it("names what an undo removed", () => {
    expect.hasAssertions();

    expect(undoneOf(undo2, index)?.id).toBe("d");
    expect(undoneOf(tokens, index)).toBeNull();
  }, 0);

  it("labels edit kinds by source", () => {
    expect.hasAssertions();

    expect(kindInfo(edit).label).toBe("Edit");
    expect(kindInfo(tokens).label).toBe("Tokens");
    expect(
      kindInfo(version("g", "Update DESIGN.md", { kind: "manual" })).label
    ).toBe("DESIGN.md");
    expect(
      kindInfo(version("h", "Add token --brand-2", { kind: "manual" })).label
    ).toBe("Tokens");
    expect(kindInfo(undo).label).toBe("Undo");
  }, 0);
});
