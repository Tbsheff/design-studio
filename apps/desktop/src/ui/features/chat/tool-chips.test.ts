import { describe, expect, it } from "vitest";

import type { ToolRow } from "./run-state-model.js";
import { groupRepeats, fileChanges } from "./tool-rows-model.js";

const INDEX_PATH = "/w/index.html";
const ROW_MS = 5;
const REPEATS = 3;
const ROW_COUNT = 4;

const row = (
  id: string,
  name: string,
  input: Record<string, string>,
  extra: Partial<ToolRow> = {}
): ToolRow => ({
  durationMs: ROW_MS,
  input,
  isError: false,
  name,
  startedAt: 0,
  summary: "",
  toolUseId: id,
  ...extra,
});

describe("tool rows", () => {
  it(
    "groups 3 reads of the same file into one row Read x3",
    { timeout: 5000 },
    () => {
      expect.hasAssertions();

      const groups = groupRepeats(
        [
          row("1", "Read", { file_path: INDEX_PATH }),
          row("2", "Read", { file_path: INDEX_PATH }),
          row("3", "Read", { file_path: INDEX_PATH }),
          row("4", "Read", { file_path: "/w/app.css" }),
        ],
        "/w"
      );

      expect(
        groups.map((group) => [group.tool.name, group.count, group.durationMs])
      ).toStrictEqual([
        ["Read", REPEATS, REPEATS * ROW_MS],
        ["Read", 1, ROW_MS],
      ]);
    }
  );

  it(
    "does not group errors, running tools or writes with diffs",
    { timeout: 5000 },
    () => {
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

      expect(groups).toHaveLength(ROW_COUNT);
      expect(fileChanges(groups.map((group) => group.tool))).toStrictEqual([
        { added: 2, path: "a", removed: 0 },
      ]);
    }
  );
});
