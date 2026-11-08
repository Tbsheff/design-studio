import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { fail, runCli } from "../stamp/args.js";
import { WORKSPACE_ROOT } from "../workspace-root.js";

interface Target {
  readonly id: string;
  readonly name: string | null;
}

interface HelpModule {
  readonly TOOL_SHORT: Readonly<Record<string, string>>;
}

interface SetsModule {
  readonly studioToolsFor: (
    project: {
      app: object | null;
      designSystemFor: string | null;
      kind: string;
    },
    mode: string,
    lean: boolean
  ) => Set<string>;
}

interface Flip {
  readonly agentText: string;
  readonly mcpText: string | null;
  readonly name: string;
}

interface SetTable {
  readonly app: ReadonlySet<string>;
  readonly design: ReadonlySet<string>;
  readonly html: ReadonlySet<string>;
  readonly lean: ReadonlySet<string>;
  readonly react: ReadonlySet<string>;
}

const ACTIONS_DIR = path.join(WORKSPACE_ROOT, "packages/common/actions/src");

const SERVER_DIR = path.join(WORKSPACE_ROOT, "apps/desktop/src/server");

const SNAPSHOT_DIR = path.join(
  WORKSPACE_ROOT,
  "apps/desktop/artifacts/mcp-snapshots"
);

const AGENT_OFF = /agent:\s*\{\s*off:\s*"legacy-agent"\s*\}/u;

const MCP_OFF = /mcp:\s*\{\s*off:\s*"legacy-mcp"\s*\}/u;

const USAGE =
  "pnpm exec tsx scripts/codemods/flip-legacy-binding.ts <action id[=tool_name]...>";

const LINE_WIDTH = 100;

const FAKE_APP = { app: {}, designSystemFor: null, kind: "html" };

const toSnake = (text: string): string =>
  text
    .replaceAll(/(?<lower>[a-z0-9])(?<upper>[A-Z])/gu, "$<lower>_$<upper>")
    .toLowerCase();

const toDerivedNames = (id: string): readonly string[] => {
  const [domain = "", verb = ""] = id.split(".");
  const words = toSnake(verb).split("_");
  const head = words[0] ?? "";
  const rest = words.slice(1).join("_");
  const object = [rest, toSnake(domain)].filter((part) => part !== "");

  return [
    `${head}_${object.join("_")}`,
    `${head}_${toSnake(domain)}`,
    toSnake(verb),
  ];
};

const toTargets = (args: readonly string[]): readonly Target[] =>
  args.map((arg) => {
    const [id = "", name = ""] = arg.split("=");

    return { id, name: name || null };
  });

const getModule = async <Module>(file: string): Promise<Module> =>
  (await import(pathToFileURL(file).href)) as Module;

const listFiles = async (dir: string): Promise<readonly string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });

  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listFiles(full);
      }

      return [full];
    })
  );

  return nested.flat().filter((file) => file.endsWith(".ts"));
};

const getDefinition = async (id: string): Promise<string> => {
  const [domain = ""] = id.split(".");
  const files = await listFiles(path.join(ACTIONS_DIR, domain));

  const texts = await Promise.all(
    files.map(async (file) => ({ file, text: await readFile(file, "utf-8") }))
  );

  const hit = texts.find(
    (entry) =>
      entry.text.includes("defineAction(") && entry.text.includes(`id: "${id}"`)
  );

  return hit?.file ?? fail(`no definition file for ${id}`, USAGE);
};

const getSets = async (): Promise<SetTable> => {
  const sets = await getModule<SetsModule>(
    path.join(SERVER_DIR, "agent/tool-sets.ts")
  );

  return {
    app: sets.studioToolsFor(FAKE_APP, "edit", false),
    design: sets.studioToolsFor(
      { app: null, designSystemFor: "x", kind: "html" },
      "edit",
      false
    ),
    html: sets.studioToolsFor(
      { app: null, designSystemFor: null, kind: "html" },
      "edit",
      false
    ),
    lean: sets.studioToolsFor(FAKE_APP, "edit", true),
    react: sets.studioToolsFor(
      { app: null, designSystemFor: null, kind: "react" },
      "edit",
      false
    ),
  };
};

const toSetName = (name: string, table: SetTable): string => {
  if (table.html.has(name) && table.app.has(name)) {
    return "core";
  }

  if (table.html.has(name)) {
    return "tweak";
  }

  if (table.design.has(name)) {
    return "design-system";
  }

  if (table.react.has(name)) {
    return "kit";
  }

  if (table.app.has(name)) {
    return "app";
  }

  return fail(`${name} is in no agent tool set`, USAGE);
};

const getSnapshotNames = async (): Promise<ReadonlySet<string>> => {
  const entries = await readdir(SNAPSHOT_DIR);
  const files = entries.filter((file) => file.endsWith(".json"));

  const parsed = await Promise.all(
    files.map(async (file) =>
      JSON.parse(await readFile(path.join(SNAPSHOT_DIR, file), "utf-8"))
    )
  );

  const names = parsed.flatMap((file: { tools: readonly { name: string }[] }) =>
    file.tools.map((tool) => tool.name)
  );

  return new Set(names);
};

const toFlip = (
  target: Target,
  help: HelpModule,
  table: SetTable,
  snapshotNames: ReadonlySet<string>
): Flip => {
  const candidates = [target.name ?? "", ...toDerivedNames(target.id)];

  const name =
    candidates.find((candidate) => candidate in help.TOOL_SHORT) ?? null;

  if (name === null) {
    return fail(
      `no legacy agent tool for ${target.id} (tried ${candidates.join(", ")})`,
      `pass ${target.id}=<tool_name>`
    );
  }

  const lean = table.lean.has(name);
  const set = toSetName(name, table);
  const short = JSON.stringify(help.TOOL_SHORT[name]);

  const agentText = `agent: {\n    lean: ${lean},\n    name: "${name}",\n    set: "${set}",\n    short: ${short},\n  }`;
  let mcpText: string | null = null;

  if (snapshotNames.has(name)) {
    mcpText = `mcp: { name: "${name}" }`;
  }

  return { agentText, mcpText, name };
};

const toFlippedText = (text: string, flip: Flip): string => {
  const withAgent = text.replace(AGENT_OFF, flip.agentText);

  if (flip.mcpText === null) {
    return withAgent;
  }

  return withAgent.replace(MCP_OFF, flip.mcpText);
};

const toDeleteLines = async (
  name: string,
  definition: string
): Promise<readonly string[]> => {
  const files = await listFiles(SERVER_DIR);
  const pattern = new RegExp(`\\b${name}\\b`, "u");

  const hits = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");

      return lines.flatMap((line, index) => {
        if (file === definition || !pattern.test(line)) {
          return [];
        }

        return [
          `${path.relative(WORKSPACE_ROOT, file)}:${index + 1}: ${line.trim().slice(0, LINE_WIDTH)}`,
        ];
      });
    })
  );

  return hits.flat();
};

const toSnapshotGroups = async (name: string): Promise<readonly string[]> => {
  const entries = await readdir(SNAPSHOT_DIR);
  const files = entries.filter((file) => file.endsWith(".json"));

  const texts = await Promise.all(
    files.map(async (file) => ({
      file,
      text: await readFile(path.join(SNAPSHOT_DIR, file), "utf-8"),
    }))
  );

  return texts.flatMap((entry) => {
    if (!entry.text.includes(`"name": "${name}"`)) {
      return [];
    }

    return [entry.file.replace(".json", "")];
  });
};

const applyTarget = async (
  target: Target,
  help: HelpModule,
  table: SetTable,
  snapshotNames: ReadonlySet<string>
): Promise<void> => {
  const definition = await getDefinition(target.id);
  const text = await readFile(definition, "utf-8");

  const flip = toFlip(target, help, table, snapshotNames);

  await writeFile(definition, toFlippedText(text, flip));

  const [lines, groups] = await Promise.all([
    toDeleteLines(flip.name, definition),
    toSnapshotGroups(flip.name),
  ]);

  console.log(
    `${target.id}: tool ${flip.name}, file ${path.relative(WORKSPACE_ROOT, definition)}`
  );
  console.log(`  snapshot group: ${groups.join(", ") || "none"}`);
  console.log("  delete these legacy entries (ToolSpec, lists, tool-groups):");
  console.log(lines.map((line) => `    ${line}`).join("\n"));
};

const runFlip = async (): Promise<void> => {
  const targets = toTargets(process.argv.slice(2));

  if (targets.length === 0) {
    fail("name at least one action id", USAGE);
  }

  const [help, table, snapshotNames] = await Promise.all([
    getModule<HelpModule>(path.join(SERVER_DIR, "agent/tool-help.ts")),
    getSets(),
    getSnapshotNames(),
  ]);

  await Promise.all(
    targets.map((target) => applyTarget(target, help, table, snapshotNames))
  );
};

await runCli(runFlip);
