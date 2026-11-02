import type { Dirent } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

interface KnownAction {
  readonly agent: string | null;
  readonly file: string;
  readonly id: string;
  readonly mcp: string | null;
  readonly route: string | null;
  readonly tool: string | null;
}

interface ActionIndex {
  readonly actions: readonly KnownAction[];
  readonly snapshotNames: ReadonlySet<string>;
}

const STAMP_ROOT = path.join(import.meta.dirname, "..", "..");

const ACTION_ROOT = path.join(STAMP_ROOT, "src/shared/actions");

const SNAPSHOTS = path.join(STAMP_ROOT, "artifacts/mcp-snapshots");

const SKIP_FILES = new Set(["index.ts", "routes.ts", "schema.ts"]);

const ID_PATTERN = /\bid:\s*"(?<value>[^"]+)"/u;

const HTTP_PATTERN =
  /http:\s*\{\s*method:\s*"(?<method>\w+)",\s*path:\s*"(?<path>[^"]+)"/u;

const MCP_PATTERN = /\bmcp:\s*\{\s*name:\s*"(?<value>[^"]+)"/u;

const AGENT_PATTERN = /\bagent:\s*\{[^}]*?\bname:\s*"(?<value>[^"]+)"/su;

const SNAPSHOT_NAME = /"name"\s*:\s*"(?<value>[^"]+)"/gu;

const TOOL_PATTERN = /\btool:\s*"(?<value>[^"]+)"/u;

const listDir = async (dir: string): Promise<Dirent[]> => {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const group = (source: string, pattern: RegExp, name: string): string | null =>
  pattern.exec(source)?.groups?.[name] ?? null;

const toRoute = (source: string): string | null => {
  const match = HTTP_PATTERN.exec(source);

  if (match === null) {
    return null;
  }

  return `${match.groups?.["method"] ?? ""} ${match.groups?.["path"] ?? ""}`;
};

const toKnown = (file: string, source: string): KnownAction | null => {
  const actionId = group(source, ID_PATTERN, "value");

  if (actionId === null || !source.includes("defineAction(")) {
    return null;
  }

  return {
    agent: group(source, AGENT_PATTERN, "value"),
    file: path.relative(STAMP_ROOT, file),
    id: actionId,
    mcp: group(source, MCP_PATTERN, "value"),
    route: toRoute(source),
    tool: group(source, TOOL_PATTERN, "value"),
  };
};

const domainFiles = async (domain: string): Promise<string[]> => {
  const entries = await listDir(path.join(ACTION_ROOT, domain));

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !SKIP_FILES.has(entry.name)
    )
    .map((entry) => path.join(ACTION_ROOT, domain, entry.name));
};

const readActions = async (): Promise<KnownAction[]> => {
  const entries = await listDir(ACTION_ROOT);

  const domains = entries.filter(
    (entry) => entry.isDirectory() && entry.name !== "_core"
  );

  const perDomain = await Promise.all(
    domains.map((entry) => domainFiles(entry.name))
  );

  const files = perDomain.flat();

  const sources = await Promise.all(
    files.map((file) => readFile(file, "utf-8"))
  );

  return files.flatMap((file, index) => {
    const known = toKnown(file, sources[index] ?? "");

    if (known === null) {
      return [];
    }

    return [known];
  });
};

const readSnapshotNames = async (): Promise<Set<string>> => {
  const found = new Set<string>();

  const listed = await listDir(SNAPSHOTS);

  const entries = listed.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".json")
  );

  const texts = await Promise.all(
    entries.map((entry) => readFile(path.join(SNAPSHOTS, entry.name), "utf-8"))
  );

  for (const source of texts) {
    for (const match of source.matchAll(SNAPSHOT_NAME)) {
      found.add(match.groups?.["value"] ?? "");
    }
  }

  return found;
};

const readActionIndex = async (): Promise<ActionIndex> => {
  const [actions, snapshotNames] = await Promise.all([
    readActions(),
    readSnapshotNames(),
  ]);

  return { actions, snapshotNames };
};

export { ACTION_ROOT, STAMP_ROOT, readActionIndex };

export type { ActionIndex, KnownAction };
