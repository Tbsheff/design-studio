import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { runChecks } from "./check-actions-catalog.js";
import {
  ALL,
  EFFECT_FOLDERS,
  NEW_FOLDERS,
  ROOTS,
  RUNTIME_ENTRIES,
  SERVER_MAIN,
} from "./check-actions-scope.ts";
import { WORKSPACE_ROOT } from "./workspace-root.ts";

interface RuleText {
  fix: string;
  id: string;
  what: string;
}

interface Hit extends Omit<RuleText, "id"> {
  file: string;
  line: number;
  rule: string;
}

interface LineRule extends RuleText {
  allowed?: string[];
  re: RegExp;
  scope: string[];
}

interface Source extends Pick<Hit, "file"> {
  lines: string[];
}

type Baseline = Record<string, Record<string, number>>;

interface Entry extends Pick<Hit, "file" | "rule"> {
  count: number;
}

const run = promisify(execFile);
const BASELINE = new URL("check-actions-baseline.json", import.meta.url);
const TEST_FILE = /\.test\.tsx?$/u;
const CODE_FILE = /\.(?:ts|tsx|mts|cts)$/u;
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*).*$/u;
const MAX_BUFFER = 67_108_864;
const WINDOW_LINES = 12;
const RUN_ACTION = "apps/desktop/src/server/handlers/_core/run-action.ts";
const MCP_REGISTRY = "apps/desktop/src/server/mcp/registry.ts";
const AGENT_REGISTRY = "apps/desktop/src/server/agent-tools/registry.ts";

const LINE_RULES: LineRule[] = [
  {
    allowed: ["apps/api/src/platform/{share-live,unlock-lockout}.ts"],
    fix: "use Effect.gen with yield*, and fail with return yield* new X({ message })",
    id: "S11",
    re: /\bthrow\b|\btry\s*\{|\basync\s|\bawait\s|\bnew Promise\b/u,
    scope: EFFECT_FOLDERS,
    what: "throw, try, async, await and new Promise are banned in Effect code",
  },
  {
    allowed: RUNTIME_ENTRIES,
    fix: "return the Effect and let an adapter run it with the runtime from apps/desktop/src/server/main/runtime.ts",
    id: "S3",
    re: /\b(?:runPromiseExit|runPromise|runSync|runFork|ManagedRuntime\.make)\b/u,
    scope: ALL,
    what: "running an Effect or making a runtime outside http, mcp, agent-tools, main and worker entries is banned",
  },
  {
    allowed: [SERVER_MAIN],
    fix: "add the Layer to apps/desktop/src/server/main/live-layer.ts",
    id: "S4",
    re: /\bLayer\.build\b|\bLayer\.fresh\b|\bEffect\.provide\([^)]*(?:\bLayer\b|\.layer\b|Live\b|\.Default\b)/u,
    scope: ALL,
    what: "building or providing a Layer outside apps/desktop/src/server/main is banned",
  },
  {
    allowed: [RUN_ACTION, "apps/api/**/middleware/**"],
    fix: "let apps/desktop/src/server/handlers/_core/run-action.ts provide the principal and org scope",
    id: "T1",
    re: /\bprovideService\(\s*(?:LocalPrincipal|LocalOrgScope|CurrentOrg)\b/u,
    scope: ALL,
    what: "providing LocalPrincipal, LocalOrgScope or CurrentOrg outside run-action.ts is banned",
  },
  {
    allowed: [
      RUN_ACTION,
      MCP_REGISTRY,
      AGENT_REGISTRY,
      "apps/desktop/src/server/{agent-tools/sdk-shape,platform/decode/index,platform/local-file/index}.ts",
    ],
    fix: "call the action through apps/desktop/src/server/handlers/_core/run-action.ts",
    id: "W7",
    re: /\bauthorizer\.require\b|\bSchema\.decodeUnknown\w*|\btoCodecStringTree\b|\btoJsonSchemaDocument\b/u,
    scope: ALL,
    what: "decoding, authorizing or building a schema document outside run-action.ts and the registries is banned",
  },
  {
    allowed: [
      "apps/desktop/src/server/http/mount.ts",
      MCP_REGISTRY,
      AGENT_REGISTRY,
    ],
    fix: "pnpm run new:op <ctx> <opKey>",
    id: "E1",
    re: /\bapp\.(?:get|post|put|patch|delete)\(|\bregisterTool\(|\btool\(/u,
    scope: ALL,
    what: "a hand-written route or tool outside http/mount.ts and the 2 registries is banned",
  },
  {
    fix: "pnpm run new:service <area> <ClassName> --access read|write",
    id: "S5",
    re: /\bEffect\.Service\b|\bEffect\.Tag\b|\bContext\.Tag\b/u,
    scope: ALL,
    what: "Effect.Service, Effect.Tag and Context.Tag are banned",
  },
  {
    fix: "decode the value with the action schema in run-action.ts or a Schema decoder",
    id: "J1",
    re: /\.json\(\)\)\s*as\b|\bJSON\.parse\(.*\)\s*as\s/u,
    scope: NEW_FOLDERS,
    what: "casting parsed JSON with as is banned in new folders",
  },
];

const TEXT = {
  access: {
    fix: 'add declare public readonly access: "read" | "write" to the class',
    id: "S6",
    what: "a Context.Service class with no access declaration is banned",
  },
  import: {
    fix: "move the shared code to apps/desktop/src/server/handlers/_core or a domain index.ts",
    id: "W14",
    what: "a service context that imports another service context is banned",
  },
  poll: {
    fix: "refresh through op.invalidates with useOp and useAction",
    id: "U12",
    what: "polling a fetch with setInterval in ui/platform is banned",
  },
  status: {
    fix: "map the tag to a status in actions/<domain>/errors/status.ts",
    id: "R1",
    what: "a status field in an error class is banned",
  },
  wire: {
    fix: "build the error body with toWire from packages/common/actions/src/_core/wire.ts",
    id: "R6",
    what: "ctx.json with an _tag or error key is banned",
  },
} satisfies Record<string, RuleText>;

const JSON_OPEN = /\b(?:ctx|c)\.json\(\s*\{/u;
const WIRE_KEY = /\b_tag\b|\berror\s*[:,}]/u;
const WINDOW_END = /\}\s*\)/u;
const CLASS_LINE = /^\s*(?:export\s+)?(?:abstract\s+)?class\s/u;
const CLOSE_LINE = /^\}/u;
const ERRORS_FILE = "**/errors/*.ts";
const STATUS_FIELD = /\bstatus\s*[:=?(]/u;
const SERVICE_CLASS = /\bextends\s+Context\.Service\b/u;
const ACCESS_FIELD = /\baccess\s*[:=?]/u;

const HANDLER_DOMAIN =
  /^apps\/desktop\/src\/server\/handlers\/(?<ctx>[^/]+)\//u;

const IMPORT_FROM =
  /(?:\bfrom\s+|\bimport\s*\(\s*|^\s*import\s+)["'](?<spec>\.[^"']*)["']/u;

const SET_INTERVAL = /\bsetInterval\(/u;
const FETCH_CALL = /\bfetch\(/u;

const inAny = (file: string, globs: string[]): boolean =>
  globs.some((glob) => path.matchesGlob(file, glob));

const isCode = (file: string): boolean =>
  CODE_FILE.test(file) && !TEST_FILE.test(file);

const listFiles = async (): Promise<string[]> => {
  const { stdout } = await run(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...ROOTS],
    { cwd: WORKSPACE_ROOT, encoding: "utf-8", maxBuffer: MAX_BUFFER }
  );

  return stdout.split("\n").filter((file) => isCode(file));
};

const readText = async (file: string | URL): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const readSource = async (file: string): Promise<Source> => {
  const text = (await readText(path.join(WORKSPACE_ROOT, file))) ?? "";

  return {
    file,
    lines: text.split("\n").map((line) => line.replace(COMMENT_LINE, "")),
  };
};

const hitOf = (rule: RuleText, file: string, index: number): Hit => ({
  file,
  fix: rule.fix,
  line: index + 1,
  rule: rule.id,
  what: rule.what,
});

const matching = (
  source: Source,
  rule: RuleText,
  test: (line: string, index: number) => boolean
): Hit[] => {
  const hits: Hit[] = [];

  for (const [index, line] of source.lines.entries()) {
    if (test(line, index)) {
      hits.push(hitOf(rule, source.file, index));
    }
  }

  return hits;
};

const lineHits = (source: Source): Hit[] =>
  LINE_RULES.filter(
    (rule) =>
      inAny(source.file, rule.scope) && !inAny(source.file, rule.allowed ?? [])
  ).flatMap((rule) => matching(source, rule, (line) => rule.re.test(line)));

const windowOf = (lines: string[], start: number): string => {
  const tail = lines.slice(start, start + WINDOW_LINES);
  const end = tail.findIndex((line) => WINDOW_END.test(line));

  return tail.slice(0, end + 1).join("\n");
};

const wireHits = (source: Source): Hit[] =>
  matching(
    source,
    TEXT.wire,
    (line, index) =>
      JSON_OPEN.test(line) && WIRE_KEY.test(windowOf(source.lines, index))
  );

const bodyAt = (lines: string[], index: number): string => {
  const line = lines[index] ?? "";

  const close = lines.findIndex(
    (next, at) => at > index && CLOSE_LINE.test(next)
  );

  if (line.trimEnd().endsWith("}") || close === -1) {
    return line;
  }

  return lines.slice(index, close + 1).join("\n");
};

const isClass = (line: string): boolean => CLASS_LINE.test(line);

const classHits = (source: Source): Hit[] => {
  const errorsFile = path.matchesGlob(source.file, ERRORS_FILE);

  return [
    ...matching(
      source,
      TEXT.status,
      (line, index) =>
        errorsFile &&
        isClass(line) &&
        STATUS_FIELD.test(bodyAt(source.lines, index))
    ),
    ...matching(source, TEXT.access, (line, index) => {
      const body = bodyAt(source.lines, index);

      return (
        isClass(line) && SERVICE_CLASS.test(body) && !ACCESS_FIELD.test(body)
      );
    }),
  ];
};

const contextOf = (file: string): string =>
  HANDLER_DOMAIN.exec(file)?.groups?.["ctx"] ?? "";

const crossesContext = (file: string, own: string, line: string): boolean => {
  const spec = IMPORT_FROM.exec(line)?.groups?.["spec"] ?? "";
  const target = contextOf(path.posix.join(path.dirname(file), spec));

  return spec !== "" && target !== "" && target !== own && target !== "_core";
};

const importHits = (source: Source): Hit[] => {
  const own = contextOf(source.file);

  return matching(
    source,
    TEXT.import,
    (line) =>
      own !== "" && own !== "_core" && crossesContext(source.file, own, line)
  );
};

const pollHits = (source: Source): Hit[] => {
  const polls =
    path.matchesGlob(source.file, "apps/desktop/src/ui/platform/**") &&
    source.lines.some((line) => FETCH_CALL.test(line));

  return matching(
    source,
    TEXT.poll,
    (line) => polls && SET_INTERVAL.test(line)
  );
};

const hitsOf = (source: Source): Hit[] => [
  ...lineHits(source),
  ...wireHits(source),
  ...classHits(source),
  ...importHits(source),
  ...pollHits(source),
];

const scan = async (): Promise<Hit[]> => {
  const files = await listFiles();
  const sources = await Promise.all(files.map((file) => readSource(file)));

  return sources.flatMap((source) => hitsOf(source));
};

const byKey = ([left]: [string, unknown], [right]: [string, unknown]): number =>
  left.localeCompare(right);

const sortKeys = <Value>(
  record: Record<string, Value>
): Record<string, Value> =>
  Object.fromEntries(Object.entries(record).toSorted(byKey));

const countEntries = (list: Entry[]): Baseline => {
  const counts: Baseline = {};

  for (const entry of list) {
    const files = counts[entry.rule] ?? {};

    files[entry.file] = (files[entry.file] ?? 0) + entry.count;
    counts[entry.rule] = files;
  }

  return sortKeys(
    Object.fromEntries(
      Object.entries(counts).map(([rule, files]) => [rule, sortKeys(files)])
    )
  );
};

const readBaseline = async (): Promise<Baseline | null> => {
  const parsed: Baseline | null = JSON.parse(
    (await readText(BASELINE)) ?? "null"
  );

  return parsed;
};

const writeBaseline = async (baseline: Baseline): Promise<void> => {
  await writeFile(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
};

const entries = (counts: Baseline): Entry[] =>
  Object.entries(counts).flatMap(([rule, files]) =>
    Object.entries(files).map(([file, count]) => ({ count, file, rule }))
  );

const countOf = (counts: Baseline, entry: Entry): number =>
  counts[entry.rule]?.[entry.file] ?? 0;

const formatHit = (hit: Hit): string =>
  `${hit.rule} ${hit.file}:${hit.line} ${hit.what}. fix: ${hit.fix}`;

const keyOf = (item: Pick<Hit, "file" | "rule">): string =>
  `${item.rule} ${item.file}`;

const riseLines = (entry: Entry, before: Baseline, hits: Hit[]): string[] => [
  `${keyOf(entry)}: ${countOf(before, entry)} -> ${entry.count} hits. fix: remove the new hits below`,
  ...hits.map((hit) => formatHit(hit)),
];

const rises = (now: Baseline, before: Baseline, hits: Hit[]): string[] => {
  const groups = Object.groupBy(hits, (hit) => keyOf(hit));

  return entries(now).flatMap((entry) => {
    if (entry.count <= countOf(before, entry)) {
      return [];
    }

    return riseLines(entry, before, groups[keyOf(entry)] ?? []);
  });
};

const drops = (now: Baseline, before: Baseline): string[] =>
  entries(before).flatMap((entry) => {
    if (countOf(now, entry) >= entry.count) {
      return [];
    }

    return [
      `note: ${entry.rule} ${entry.file}: ${entry.count} -> ${countOf(now, entry)} hits. fix: pnpm run check:actions --update`,
    ];
  });

const lowerOf = (now: Baseline, before: Baseline): Baseline =>
  countEntries(
    entries(before).flatMap((entry) => {
      const count = Math.min(entry.count, countOf(now, entry));

      if (count === 0) {
        return [];
      }

      return [{ count, file: entry.file, rule: entry.rule }];
    })
  );

const print = (lines: string[]): void => {
  process.stdout.write(`${lines.join("\n")}\n`);
};

const total = (counts: Baseline): number =>
  entries(counts).reduce((sum, entry) => sum + entry.count, 0);

const UPDATE = process.argv.includes("--update");

const when = (flag: boolean, text: string): string => {
  if (flag) {
    return text;
  }

  return "";
};

const firstRun = async (now: Baseline): Promise<number> => {
  if (!UPDATE) {
    print(["check-actions: no baseline. fix: pnpm run check:actions --update"]);

    return 1;
  }

  await writeBaseline(now);
  print([`check-actions: baseline recorded, ${total(now)} legacy hits`]);

  return 0;
};

const checkScan = async (): Promise<number> => {
  const hits = await scan();

  const now = countEntries(
    hits.map((hit) => ({ count: 1, file: hit.file, rule: hit.rule }))
  );

  const before = await readBaseline();

  if (before === null) {
    return firstRun(now);
  }

  const problems = rises(now, before, hits);
  const notes = drops(now, before);
  const lower = UPDATE && notes.length > 0;
  const failed = problems.length > 0;

  if (lower) {
    await writeBaseline(lowerOf(now, before));
  }

  print([
    ...notes,
    ...problems,
    `check-actions: ${when(failed, "fail")}${when(!failed, "pass")}, ${total(now)} hits (baseline ${total(before)})${when(lower, ", baseline lowered")}`,
  ]);

  return Number(failed);
};

process.exitCode = await runChecks(checkScan, process.argv);
