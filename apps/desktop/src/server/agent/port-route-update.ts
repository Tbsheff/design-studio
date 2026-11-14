import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PortPlan } from "@design-studio/contracts/port";
import { Result, Schema } from "effect";

import { diffLines } from "../../shared/line-diff.js";
import { toDecoder } from "../platform/decode/index.js";
import { ConflictError } from "../platform/errors/index.js";

interface RouteUpdateInput {
  readonly source: {
    readonly direction: { readonly workTree: string };
    readonly path: string;
  };
  readonly target: {
    readonly direction: { readonly workTree: string };
    readonly project: { readonly id: string };
    readonly route: string;
  };
}

interface RouteUpdate {
  readonly file: string;
  readonly now: string;
  readonly snapshot: string | null;
}

interface RouteFileText {
  readonly file: string;
  readonly text: string;
}

const RECORD_FILE = path.join(".studio", "route-source.json");

const SNAPSHOT_DIR = path.join(".studio", "route-source", "files");

const UPDATE_TAG = "route-update";

const NOW_TAG = "route-file-now";

const SNAPSHOT_TAG = "route-file-at-copy";

const DIFF_TAG = "route-file-diff";

const PLAN_CLOSE = "</port-plan>";

const ROUTE_TEXT_MAX = 24_000;

const AWAIT_CALL = /\bawait\s+(?<name>[A-Za-z_$][\w$.]*)\s*\(/gu;

const QUERY_CALL =
  /\b(?<name>[A-Za-z_$][\w$.]*\.(?:useQuery|useSuspenseQuery|useInfiniteQuery|query|prefetch))\s*\(/gu;

const PARAM_READ = /\b(?<name>params|searchParams)\b/gu;

const RULE_LINES = [
  "The route file exists in the app. Update it in place. Do not make a new route.",
  "Keep every data read: server component await calls, tRPC or fetch calls, params and searchParams use, loaders.",
  "Keep the exports Next needs: default, generateMetadata, dynamic, revalidate. Keep the imports that the kept code uses.",
  "Replace the markup and the classes with the prototype design. Map them to the app tokens and kit as the port plan says.",
  "Bind the design to the route's own data. The prototype rows are sample data: do not write a sample row into the app.",
];

const RouteFileSchema = Schema.Struct({ file: Schema.String });

const RouteCopyEntrySchema = Schema.Struct({
  appProjectId: Schema.String,
  files: Schema.Array(RouteFileSchema),
  page: Schema.String,
});

const RouteCopyRecordSchema = Schema.Struct({
  entries: Schema.Array(RouteCopyEntrySchema),
});

const decodeRecord = toDecoder(
  Schema.fromJsonString(RouteCopyRecordSchema),
  "ignore"
);

const getText = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toPagePath = (page: string): string => page.replace(/^\/+/u, "");

const isRouteCopyOf = async (
  input: RouteUpdateInput,
  routeFile: string
): Promise<boolean> => {
  const text = await getText(
    path.join(input.source.direction.workTree, RECORD_FILE)
  );

  if (text === null) {
    return false;
  }

  const decoded = decodeRecord(text);

  if (Result.isFailure(decoded)) {
    return false;
  }

  const page = toPagePath(input.source.path);
  const entry = decoded.success.entries.find((item) => item.page === page);

  return (
    entry?.appProjectId === input.target.project.id &&
    entry.files[0]?.file === routeFile
  );
};

const toRouteUpdate = async (
  input: RouteUpdateInput,
  plan: PortPlan
): Promise<RouteUpdate | null> => {
  const file = plan.target?.routeFile ?? null;

  if (plan.target?.routeExists !== true || file === null) {
    return null;
  }

  if (!(await isRouteCopyOf(input, file))) {
    throw new ConflictError(
      `The app already has the route ${input.target.route} (${file}). Pick a new path.`
    );
  }

  const folder = encodeURIComponent(toPagePath(input.source.path));
  const sourceTree = input.source.direction.workTree;
  const snapshotFile = path.join(sourceTree, SNAPSHOT_DIR, folder, file);
  const nowFile = path.join(input.target.direction.workTree, file);

  const [now, snapshot] = await Promise.all([
    getText(nowFile),
    getText(snapshotFile),
  ]);

  return { file, now: now ?? "", snapshot: snapshot ?? null };
};

const toCut = (text: string): string => {
  if (text.length <= ROUTE_TEXT_MAX) {
    return text;
  }

  return `${text.slice(0, ROUTE_TEXT_MAX)}\n// cut at ${ROUTE_TEXT_MAX} characters`;
};

const toBlock = (tag: string, body: string): string =>
  ["<", tag, ">\n", toCut(body), "\n</", tag, ">"].join("");

const toDiffText = (update: RouteUpdate): string => {
  if (update.snapshot === null || update.snapshot === update.now) {
    return "";
  }

  const marks = { add: "+", del: "-", same: " " } as const;

  const lines: string[] = [];

  for (const hunk of diffLines(update.snapshot, update.now).hunks) {
    lines.push(`@@ -${hunk.oldStart} +${hunk.newStart} @@`);

    for (const line of hunk.lines) {
      lines.push(`${marks[line.kind]}${line.text}`);
    }
  }

  return lines.join("\n");
};

const toChangedNote = (diff: string): string[] => {
  if (diff === "") {
    return [];
  }

  return [
    "The app route changed since the copy. The diff below goes from the copy to the app now. Keep the app change.",
    toBlock(DIFF_TAG, diff),
  ];
};

const toSnapshotBlock = (update: RouteUpdate): string[] => {
  if (update.snapshot === null) {
    return [];
  }

  return [toBlock(SNAPSHOT_TAG, update.snapshot)];
};

const toUpdateTag = (update: RouteUpdate): string => {
  const diff = toDiffText(update);

  const body = [
    ...RULE_LINES,
    toBlock(NOW_TAG, update.now),
    ...toSnapshotBlock(update),
    ...toChangedNote(diff),
  ].join("\n\n");

  return [
    "<",
    UPDATE_TAG,
    ' file="',
    update.file,
    '">\n',
    body,
    "\n</",
    UPDATE_TAG,
    ">",
  ].join("");
};

const toUpdatedPrompt = (
  prompt: string,
  update: RouteUpdate | null
): string => {
  if (update === null) {
    return prompt;
  }

  const at = prompt.indexOf(PLAN_CLOSE);

  if (at === -1) {
    return [prompt, toUpdateTag(update)].join("\n\n");
  }

  const end = at + PLAN_CLOSE.length;

  return [
    prompt.slice(0, end),
    "\n\n",
    toUpdateTag(update),
    prompt.slice(end),
  ].join("");
};

const toBetween = (
  text: string,
  open: string,
  close: string
): string | null => {
  const start = text.indexOf(open);
  const end = text.indexOf(close, start);

  if (start === -1 || end === -1) {
    return null;
  }

  return text.slice(start + open.length, end);
};

const toRouteFileNow = (prompt: string): RouteFileText | null => {
  const head = toBetween(prompt, `<${UPDATE_TAG} file="`, '">');
  const text = toBetween(prompt, `<${NOW_TAG}>\n`, `\n</${NOW_TAG}>`);

  if (head === null || text === null) {
    return null;
  }

  return { file: head, text };
};

const toDataReads = (text: string): Set<string> => {
  const names = new Set<string>();

  for (const pattern of [AWAIT_CALL, QUERY_CALL, PARAM_READ]) {
    for (const found of text.matchAll(pattern)) {
      names.add(found.groups?.["name"] ?? "");
    }
  }

  names.delete("");

  return names;
};

const toReadsText = (kept: number, total: number): string => {
  if (total === 1 && kept === 1) {
    return "kept 1 data read";
  }

  if (kept === total) {
    return `kept ${total} data reads`;
  }

  return `kept ${kept} of ${total} data reads`;
};

const toRouteUpdateNotes = async (
  prompt: string,
  workTree: string
): Promise<string[]> => {
  const before = toRouteFileNow(prompt);

  if (before === null) {
    return [];
  }

  const after = (await getText(path.join(workTree, before.file))) ?? "";
  const reads = [...toDataReads(before.text)];
  const now = toDataReads(after);
  const kept = reads.filter((name) => now.has(name)).length;

  return [`Updated ${before.file} (${toReadsText(kept, reads.length)}).`];
};

export { toRouteFileNow, toRouteUpdate, toRouteUpdateNotes, toUpdatedPrompt };

export type { RouteFileText, RouteUpdate, RouteUpdateInput };
