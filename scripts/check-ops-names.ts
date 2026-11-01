import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface RuleText {
  fix: string;
  id: string;
  what: string;
}

interface Hit {
  file: string;
  fix: string;
  rule: string;
  what: string;
}

interface Binding {
  readonly lean?: boolean;
  readonly name?: string;
  readonly off?: string;
  readonly set?: string;
  readonly short?: string;
}

interface SchemaLike {
  readonly ast?: { readonly _tag?: string };
  readonly fields?: Readonly<Record<string, SchemaLike>>;
}

interface CatalogOp {
  readonly access: string;
  readonly agent: Binding;
  readonly confirm: string;
  readonly description: string;
  readonly errors: readonly { readonly name: string }[];
  readonly http: { readonly method: string; readonly path: string };
  readonly id: string;
  readonly input: SchemaLike;
  readonly invalidates?: readonly string[];
  readonly mcp: Binding;
  readonly needs: string;
  readonly output: SchemaLike;
  readonly scope: string;
}

type Catalog = Readonly<Record<string, Readonly<Record<string, CatalogOp>>>>;

interface OpRow {
  readonly ctx: string;
  readonly file: string;
  readonly key: string;
  readonly op: CatalogOp;
}

interface NamedTool {
  readonly name: string;
}

type Snapshot = NamedTool[] | { readonly tools?: NamedTool[] };

interface Legacy {
  readonly agent: ReadonlySet<string>;
  readonly allowed: ReadonlySet<string>;
  readonly mcp: ReadonlySet<string>;
  readonly note: string;
}

interface Policy {
  allowBash: boolean;
  mode: "critique" | "edit";
  skills: string[];
}

const ROOT = path.join(import.meta.dirname, "..");

const SNAPSHOTS = "artifacts/mcp-snapshots";

const CLOUD_PERMISSIONS = "cloud/api/src/auth/permissions.ts";

const AGENT_PREFIX = "mcp__studio__";

const QUOTED_NAME = /["'](?<name>[a-z][a-z0-9_]*)["']/gu;

const EDITS_NOTE = /const EDITS_NOTE =\s*"(?<text>[^"]*)"/u;

const readText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(path.join(ROOT, file), "utf-8");
  } catch {
    return null;
  }
};

const loadModule = async <Module>(file: string): Promise<Module> =>
  (await import(pathToFileURL(path.resolve(ROOT, file)).href)) as Module;

const opHit = (rule: RuleText, row: OpRow, detail: string): Hit => ({
  file: `${row.file}:1`,
  fix: rule.fix,
  rule: rule.id,
  what: `${rule.what}: ${row.op.id} ${detail}`,
});

const nameOf = (binding: Binding): string | null => binding.name ?? null;

const firstOf = (...values: (string | null)[]): string | null =>
  values.find((value) => value !== null) ?? null;

const E16: RuleText = {
  fix: "derive the tool from AllOps and remove the legacy entry",
  id: "E16",
  what: "an op tool name is not derived or is still in a legacy list",
};

const SNAPSHOT: RuleText = {
  fix: "keep the tool name, or record the removal in the MCP snapshot diff",
  id: "O14",
  what: "a name in an MCP snapshot no longer exists",
};

const T4: RuleText = {
  fix: `add the permission to ${CLOUD_PERMISSIONS}`,
  id: "T4",
  what: "an op needs a permission the cloud does not know",
};

const quotedNames = (text: string): string[] =>
  [...text.matchAll(QUOTED_NAME)].map((match) => match.groups?.["name"] ?? "");

const agentLegacy = async (): Promise<Set<string>> => {
  const [legacy, help, ...texts] = await Promise.all([
    loadModule<{ LEGACY_AGENT_TOOLS: readonly string[] }>(
      "src/server/agent/legacy/all.ts"
    ),
    loadModule<{ TOOL_SHORT: Readonly<Record<string, string>> }>(
      "src/server/agent/tool-help.ts"
    ),
    readText("src/server/agent/tool-sets.ts"),
    readText("src/server/agent/permissions.ts"),
  ]);

  return new Set([
    ...legacy.LEGACY_AGENT_TOOLS.map((tool) => tool.replace(AGENT_PREFIX, "")),
    ...Object.keys(help.TOOL_SHORT),
    ...texts.flatMap((text) => quotedNames(text ?? "")),
  ]);
};

const mcpLegacy = async (): Promise<Set<string>> => {
  const [edit, read] = await Promise.all([
    loadModule<{ EDIT_NAMES: ReadonlySet<string> }>(
      "src/server/mcp/edit-tools.ts"
    ),
    loadModule<{ TOOLS: readonly NamedTool[] }>("src/server/mcp/tools.ts"),
  ]);

  return new Set([...edit.EDIT_NAMES, ...read.TOOLS.map((tool) => tool.name)]);
};

const editsNote = async (): Promise<string> => {
  const text = (await readText("src/server/mcp/server.ts")) ?? "";

  return EDITS_NOTE.exec(text)?.groups?.["text"] ?? "";
};

const permitted = async (): Promise<Set<string>> => {
  const permissions = await loadModule<{
    permittedToolNames: (policy: Policy) => string[];
  }>("src/server/agent/permissions.ts");

  return new Set(
    permissions.permittedToolNames({
      allowBash: true,
      mode: "edit",
      skills: ["any"],
    })
  );
};

const agentProblem = (name: string | null, legacy: Legacy): string | null => {
  if (name === null) {
    return null;
  }

  if (!legacy.allowed.has(`${AGENT_PREFIX}${name}`)) {
    return `${name} is not in permittedToolNames`;
  }

  if (legacy.agent.has(name)) {
    return `${name} is in an agent legacy list`;
  }

  return null;
};

const mcpProblem = (name: string | null, legacy: Legacy): string | null => {
  if (name === null) {
    return null;
  }

  const inNote = new RegExp(`\\b${name}\\b`, "u").test(legacy.note);

  if (legacy.mcp.has(name) || inNote) {
    return `${name} is in an MCP legacy list or EDITS_NOTE`;
  }

  return null;
};

const e16Hits = async (rows: OpRow[]): Promise<Hit[]> => {
  if (rows.length === 0) {
    return [];
  }

  const [agent, allowed, mcp, note] = await Promise.all([
    agentLegacy(),
    permitted(),
    mcpLegacy(),
    editsNote(),
  ]);

  const legacy: Legacy = { agent, allowed, mcp, note };

  return rows.flatMap((row) => {
    const detail = firstOf(
      agentProblem(nameOf(row.op.agent), legacy),
      mcpProblem(nameOf(row.op.mcp), legacy)
    );

    if (detail === null) {
      return [];
    }

    return [opHit(E16, row, detail)];
  });
};

const snapshotTools = (snapshot: Snapshot): readonly NamedTool[] => {
  if (Array.isArray(snapshot)) {
    return snapshot;
  }

  return snapshot.tools ?? [];
};

const snapshotFiles = async (): Promise<string[]> => {
  try {
    const names = await readdir(path.join(ROOT, SNAPSHOTS));

    return names.flatMap((name) => {
      if (name.endsWith(".json")) {
        return [`${SNAPSHOTS}/${name}`];
      }

      return [];
    });
  } catch {
    return [];
  }
};

const snapshotHits = async (rows: OpRow[]): Promise<Hit[]> => {
  const files = await snapshotFiles();

  if (files.length === 0) {
    return [];
  }

  const live = new Set([
    ...(await mcpLegacy()),
    ...rows.flatMap((row) => nameOf(row.op.mcp) ?? []),
  ]);

  const texts = await Promise.all(files.map((file) => readText(file)));

  return files.flatMap((file, index) => {
    const snapshot = JSON.parse(texts[index] ?? "[]") as Snapshot;

    return snapshotTools(snapshot).flatMap((tool) => {
      if (live.has(tool.name)) {
        return [];
      }

      return [
        {
          file: `${file}:1`,
          fix: SNAPSHOT.fix,
          rule: SNAPSHOT.id,
          what: `${SNAPSHOT.what}: ${tool.name}`,
        },
      ];
    });
  });
};

const permissionHits = async (rows: OpRow[]): Promise<Hit[]> => {
  if ((await readText(CLOUD_PERMISSIONS)) === null) {
    return [];
  }

  const cloud =
    await loadModule<Readonly<Record<string, readonly string[]>>>(
      CLOUD_PERMISSIONS
    );

  const known = new Set(
    Object.values(cloud)
      .filter((value) => Array.isArray(value))
      .flat()
  );

  return rows.flatMap((row) => {
    if (known.has(row.op.needs)) {
      return [];
    }

    return [opHit(T4, row, `needs ${row.op.needs}`)];
  });
};

export {
  e16Hits,
  firstOf,
  loadModule,
  nameOf,
  opHit,
  permissionHits,
  snapshotHits,
};

export type { Binding, Catalog, Hit, OpRow, RuleText, SchemaLike };
