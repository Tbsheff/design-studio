import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import type { Project } from "@design-studio/actions/_core/contracts";
import { buildSystemPrompt, buildTasteBlock } from "./prompt.js";
import { loadTasteRules, tasteHome } from "./taste.js";

const dirs: string[] = [];

function library(
  rows: { id: string; scope: string; data: unknown; retired?: boolean }[]
): string {
  const home = mkdtempSync(path.join(os.tmpdir(), "taste-"));
  dirs.push(home);
  const db = new DatabaseSync(path.join(home, "library.sqlite3"));
  db.exec(`CREATE TABLE preferences (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, scope TEXT NOT NULL, project TEXT, data TEXT NOT NULL);
    CREATE TABLE retired (preference_id TEXT PRIMARY KEY, data TEXT NOT NULL);`);
  rows.forEach((row, index) => {
    const data =
      typeof row.data === "string" ? row.data : JSON.stringify(row.data);

    db.prepare("INSERT INTO preferences VALUES (?,?,?,?,?)").run(
      row.id,
      `2026-10-0${index + 1}`,
      row.scope,
      null,
      data
    );

    if (row.retired) {
      db.prepare("INSERT INTO retired VALUES (?,?)").run(row.id, "{}");
    }
  });
  db.close();

  return home;
}

afterEach(() => {
  delete process.env.STUDIO_TASTE;

  for (const dir of dirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe(loadTasteRules, () => {
  it("returns active global rules only, without statements or ids", () => {
    const home = library([
      {
        data: {
          area: "layout",
          kind: "prefer",
          rule: "Group with space",
          statement: "private quote",
        },
        id: "a",
        scope: "global",
      },
      {
        data: { area: "surfaces", kind: "avoid", rule: "Heavy borders" },
        id: "b",
        retired: true,
        scope: "global",
      },
      {
        data: { area: "type", kind: "prefer", rule: "Project only" },
        id: "c",
        scope: "project",
      },
      {
        data: { kind: "avoid", rule: "Bounce easing" },
        id: "d",
        scope: "global",
      },
      { data: { kind: "maybe", rule: "Ignored" }, id: "e", scope: "global" },
    ]);

    expect(loadTasteRules(home)).toEqual([
      { area: "layout", kind: "prefer", rule: "Group with space" },
      { area: "general", kind: "avoid", rule: "Bounce easing" },
    ]);
  });

  it("returns nothing when the library is missing, broken, or turned off", () => {
    expect(
      loadTasteRules(path.join(os.tmpdir(), "no-such-taste-home"))
    ).toEqual([]);
    expect(
      loadTasteRules(library([{ data: "{not json", id: "x", scope: "global" }]))
    ).toEqual([]);
    process.env.STUDIO_TASTE = "0";
    expect(
      loadTasteRules(
        library([
          { data: { kind: "prefer", rule: "R" }, id: "y", scope: "global" },
        ])
      )
    ).toEqual([]);
  });

  it("resolves the home from DESIGN_MEMORY_HOME", () => {
    expect(tasteHome({ DESIGN_MEMORY_HOME: "~/x" })).toBe(
      path.join(os.homedir(), "x")
    );
    expect(tasteHome({})).toBe(path.join(os.homedir(), ".design-memory"));
  });
});

describe("taste prompt block", () => {
  const project = {
    entry: "index.html",
    kind: "html",
    settings: { allowBash: false, allowInstall: false },
  } as unknown as Project;

  const rules = [
    { area: "layout", kind: "prefer" as const, rule: "Group with space" },
  ];

  it("adds the block in edit and critique, and leaves it out with no rules", () => {
    const edit = buildSystemPrompt(project, "edit", null, 0, rules);
    expect(edit).toContain(
      "<taste>\n- Prefer (layout): Group with space\n</taste>"
    );
    expect(buildSystemPrompt(project, "critique", null, 0, rules)).toContain(
      "In a critique, name each place"
    );
    expect(buildSystemPrompt(project, "edit")).not.toContain("<taste>");
    expect(buildTasteBlock(rules, "edit")).not.toContain("In a critique");
  });
});
