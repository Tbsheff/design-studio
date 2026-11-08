import { describe, expect, it } from "vitest";

import type { ToolRow } from "./run-state-model.js";
import { groupRepeats, fileChanges } from "./tool-rows-model.js";

const row = (
  id: string,
  name: string,
  input: unknown,
  extra: Partial<ToolRow> = {}
): ToolRow => ({
  durationMs: 5,
  input,
  isError: false,
  name,
  startedAt: 0,
  summary: "",
  toolUseId: id,
  ...extra,
});

describe("tool rows", () => {
  it("groups 3 reads of the same file into one row Read x3", () => {
    expect.hasAssertions();

    const groups = groupRepeats(
      [
        row("1", "Read", { file_path: "/w/index.html" }),
        row("2", "Read", { file_path: "/w/index.html" }),
        row("3", "Read", { file_path: "/w/index.html" }),
        row("4", "Read", { file_path: "/w/app.css" }),
      ],
      "/w"
    );

    expect(
      groups.map((group) => [group.tool.name, group.count, group.durationMs])
    ).toStrictEqual([
      ["Read", 3, 15],
      ["Read", 1, 5],
    ]);
  }, 5000);

  it("does not group errors, running tools or writes with diffs", () => {
    expect.hasAssertions();

    const diff = {
      added: 1,
      created: false,
      hunks: [],
      path: "a",
      removed: 0,
      truncated: false,
    };

    const groups = groupRepeats(
      [
        row("1", "Read", { file_path: "a" }),
        row("2", "Read", { file_path: "a" }, { isError: true }),
        row("3", "Edit", { file_path: "a" }, { diff }),
        row("4", "Edit", { file_path: "a" }, { diff }),
      ],
      null
    );

    expect(groups).toHaveLength(4);
    expect(fileChanges(groups.map((group) => group.tool))).toStrictEqual([
      { added: 2, path: "a", removed: 0 },
    ]);
  }, 5000);
});
