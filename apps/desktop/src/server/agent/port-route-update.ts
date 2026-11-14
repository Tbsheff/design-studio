import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PortPlan } from "@design-studio/contracts/port";
import { Result, Schema } from "effect";

import { diffLines } from "../../shared/line-diff.js";
import { toDecoder } from "../platform/decode/index.js";
import { ConflictError } from "../platform/errors/index.js";
import { listRouteFolderFiles, toStyleStackLine } from "./port-route-folder.js";
import type { RouteFolderFile } from "./port-route-folder.js";

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
  readonly folderFiles: readonly RouteFolderFile[];
  readonly layoutLine: string;
  readonly now: string;
  readonly snapshot: string | null;
  readonly styleStack: string;
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

const FOLDER_TAG = "route-folder-file";

const FOLDER_HEAD_END = '">\n';

const PLAN_CLOSE = "</port-plan>";

const ROUTE_TEXT_MAX = 24_000;

const AWAIT_CALL = /\bawait\s+(?<name>[A-Za-z_$][\w$.]*)\s*\(/gu;

const QUERY_CALL =
  /\b(?<name>[A-Za-z_$][\w$.]*\.(?:useQuery|useSuspenseQuery|useInfiniteQuery|query|prefetch))\s*\(/gu;

const PARAM_READ = /\b(?<name>params|searchParams)\b/gu;

const HOOK_CALL = /\b(?<name>use[A-Z]\w*)\s*\(/gu;

const REACT_HOOKS: ReadonlySet<string> = new Set([
  "useActionState",
  "useCallback",
  "useContext",
  "useDeferredValue",
  "useEffect",
  "useFormStatus",
  "useId",
  "useImperativeHandle",
  "useInsertionEffect",
  "useLayoutEffect",
  "useMemo",
  "useOptimistic",
  "useReducer",
  "useRef",
  "useState",
  "useSyncExternalStore",
  "useTransition",
]);

const RULE_LINES = [
  "The route file exists in the app. Update it in place. Do not make a new route.",
  "Keep every data read: server component await calls, tRPC or fetch calls, params and searchParams use, loaders.",
  "Keep the exports Next needs: default, generateMetadata, dynamic, revalidate. Keep the imports that the kept code uses.",
  "Replace the markup and the classes with the prototype design. Map them to the app tokens and kit as the port plan says.",
  "Also restyle the components that the route imports from its own folder. Keep their data reads (hooks, queries) and exports.",
  "Bind the design to the route's own data. The prototype rows are sample data: do not write a sample row into the app.",
  "Change the route files only with the Edit or Write tool. Do not change them with Bash: sed -i fails on macOS.",
  "First, before any other route write, call the tool mcp__studio__apply_port with only routePath (load it with ToolSearch). It writes the measured prototype values (spacing, size, gap) into the route files. Then make the other changes with Edit.",
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

type RouteCopyEntry = typeof RouteCopyEntrySchema.Type;

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

const toCopyEntry = async (
  input: RouteUpdateInput
): Promise<RouteCopyEntry | null> => {
  const text = await getText(
    path.join(input.source.direction.workTree, RECORD_FILE)
  );

  if (text === null) {
    return null;
  }

  const decoded = decodeRecord(text);

  if (Result.isFailure(decoded)) {
    return null;
  }

  const page = toPagePath(input.source.path);

  return decoded.success.entries.find((item) => item.page === page) ?? null;
};

const isRouteCopyOf = (
  input: RouteUpdateInput,
  entry: RouteCopyEntry | null,
  routeFile: string
): boolean =>
  entry?.appProjectId === input.target.project.id &&
  entry.files[0]?.file === routeFile;

const toLayoutLine = (entry: RouteCopyEntry | null): string => {
  const layouts = (entry?.files ?? [])
    .slice(1)
    .map((item) => `\`${item.file}\``);

  if (layouts.length === 0) {
    return "";
  }

  return `The prototype page also shows the parts that ${layouts.join(", ")} render, for example the app header and nav. Those files stay as they are, and the route renders inside them. Do not copy that markup into the route.`;
};

const toRouteUpdate = async (
  input: RouteUpdateInput,
  plan: PortPlan
): Promise<RouteUpdate | null> => {
  const file = plan.target?.routeFile ?? null;

  if (plan.target?.routeExists !== true || file === null) {
    return null;
  }

  const entry = await toCopyEntry(input);

  if (!isRouteCopyOf(input, entry, file)) {
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

  const targetTree = input.target.direction.workTree;
  const folderFiles = await listRouteFolderFiles(targetTree, file, now ?? "");

  return {
    file,
    folderFiles,
    layoutLine: toLayoutLine(entry),
    now: now ?? "",
    snapshot: snapshot ?? null,
    styleStack: await toStyleStackLine(targetTree, file, folderFiles),
  };
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

const toFolderBlock = (folderFile: RouteFolderFile): string =>
  [
    "<",
    FOLDER_TAG,
    ' file="',
    folderFile.file,
    '">\n',
    toCut(folderFile.text),
    "\n</",
    FOLDER_TAG,
    ">",
  ].join("");

const toUpdateTag = (update: RouteUpdate): string => {
  const diff = toDiffText(update);

  const body = [
    ...RULE_LINES,
    update.layoutLine,
    update.styleStack,
    toBlock(NOW_TAG, update.now),
    ...update.folderFiles.map((folderFile) => toFolderBlock(folderFile)),
    ...toSnapshotBlock(update),
    ...toChangedNote(diff),
  ]
    .filter((part) => part !== "")
    .join("\n\n");

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

  for (const pattern of [AWAIT_CALL, QUERY_CALL, PARAM_READ, HOOK_CALL]) {
    for (const found of text.matchAll(pattern)) {
      names.add(found.groups?.["name"] ?? "");
    }
  }

  names.delete("");

  for (const hook of REACT_HOOKS) {
    names.delete(hook);
  }

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

const toFolderFilesBefore = (prompt: string): RouteFileText[] =>
  prompt
    .split(`<${FOLDER_TAG} file="`)
    .slice(1)
    .flatMap((part) => {
      const head = part.indexOf(FOLDER_HEAD_END);
      const end = part.indexOf(`\n</${FOLDER_TAG}>`);

      if (head === -1 || end === -1) {
        return [];
      }

      return [
        {
          file: part.slice(0, head),
          text: part.slice(head + FOLDER_HEAD_END.length, end),
        },
      ];
    });

interface FileReads {
  readonly isChanged: boolean;
  readonly kept: number;
  readonly total: number;
}

const toFileReads = (before: string, after: string): FileReads => {
  const reads = [...toDataReads(before)];
  const now = toDataReads(after);

  return {
    isChanged: before !== after,
    kept: reads.filter((name) => now.has(name)).length,
    total: reads.length,
  };
};

const toFileList = (names: readonly string[]): string => {
  if (names.length <= 1) {
    return names.join("");
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;
};

const toRouteUpdateNotes = async (
  prompt: string,
  workTree: string
): Promise<string[]> => {
  const before = toRouteFileNow(prompt);

  if (before === null) {
    return [];
  }

  const files = [before, ...toFolderFilesBefore(prompt)];

  const afters = await Promise.all(
    files.map(
      async (item) => (await getText(path.join(workTree, item.file))) ?? ""
    )
  );

  const reads = files.map((item, index) =>
    toFileReads(item.text, afters[index] ?? "")
  );

  const kept = reads.reduce((sum, item) => sum + item.kept, 0);
  const total = reads.reduce((sum, item) => sum + item.total, 0);

  const changed = files.slice(1).flatMap((item, index) => {
    if (reads[index + 1]?.isChanged === true) {
      return [path.basename(item.file)];
    }

    return [];
  });

  return [
    `Updated ${toFileList([before.file, ...changed])} (${toReadsText(kept, total)}).`,
  ];
};

export { toRouteFileNow, toRouteUpdate, toRouteUpdateNotes, toUpdatedPrompt };

export type { RouteFileText, RouteUpdate, RouteUpdateInput };
