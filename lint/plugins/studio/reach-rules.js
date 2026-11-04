import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { lastName, rule } from "./ast.js";
import { relativeOf } from "./facts.js";
import { committedTextOf } from "./freeze-rules.js";
import { portRules } from "./port-rules.js";
import { noOptionalNull } from "./type-rules.js";
import { SHIM_FILES, ZOD_BRIDGE_FILES } from "./frozen-port.js";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const TSC = path.join(ROOT, "node_modules/.bin/tsc");

const DAY_ONE = "lint/day-one.ts";

const TSC_BUFFER = 67_108_864;

const MAX_TSC_LINES = 3;

const FILES_BLOCK = /const FILES = \[\n(?<body>[\s\S]*?)\n\];/u;

const FILE_ROW = /"(?<file>[^"]+)"/gu;

const RULE_ROW = /^ {2}\["(?<name>[^"]+)", .*, \[(?<hits>[\d,]*)\]\],$/gmu;

const ZOD_BRIDGE = /(?:^|\/)platform\/zod-bridge\/index\.js$/u;

const TARGET_AREAS = new Set(["agent-tools", "canvas", "direct-edit", "events", "page-probe", "platform"]);

const AGGREGATOR_TARGETS = new Set(["apps/desktop/src/server/agent-tools/registry.js"]);

const TARGET_INDEX = /^apps\/desktop\/src\/server\/[a-z-]+\/(?:[a-z-]+\/)?index\.js$/u;

const SERVER_FILE = /^apps\/desktop\/src\/server\/(?<area>[a-z-]+)\//u;

const PREVIEW_BARREL = /^apps\/desktop\/src\/server\/preview\/index\.js$/u;

const DECODE_CALL = /^decode(?:Unknown|Sync|Effect|Result|Promise|Option|Exit)?/u;

const NOT_READ_LIST = /^(?:Result|Sync|Effect|Promise|Option|Exit)$/u;

const PAIRS_MESSAGE =
  "A lint/day-one.ts row that names a new rule and file pair is banned (L10), because RULES hold index numbers into FILES and a deleted FILES entry moves every later row to the wrong file. Use pnpm run lint:day-one to rewrite the whole table, or keep the FILES slot.";

const BRIDGE_MESSAGE =
  "A new import of platform/zod-bridge is banned (S14). Use Effect Schema fields with toSdkFieldSet from apps/desktop/src/server/agent-tools/index.ts, because ZOD_BRIDGE_FILES in lint/plugins/studio/frozen-port.js may only shrink.";

const TARGET_MESSAGE =
  "An import past the index.ts of another server area is banned (W13, W16). Use <area>/index.ts or <area>/<subfolder>/index.ts, and widen the export there. If the index makes a cycle, move the code to apps/desktop/src/server/platform/<module>/index.ts.";

const BARREL_MESSAGE =
  "A value import of apps/desktop/src/server/preview/index.ts from a lower area is banned (W8, W19), because that file pulls agent and mcp and closes long cycles. Use the leaf module, for example apps/desktop/src/server/preview/capture/index.ts.";

const DECODE_MESSAGE =
  "A Schema decode call in tool or import code is banned (W7, P1). Use toDecoder from apps/desktop/src/server/platform/decode/index.ts, or toToolInput from apps/desktop/src/server/agent-tools/index.ts.";

const SHIM_MESSAGE =
  "A file that holds only re-exports and is not index.ts is banned (W22, U14). Use an import of the owner file in each caller, and delete the shim.";

const LIST_MESSAGE =
  "A name in FROZEN_LISTS with no declaration in a pinned file is banned (L22), because the guard then checks nothing. Use the real const name in lint/plugins/studio/freeze-rules.js.";

const TSC_MESSAGE =
  "A commit with tsc errors is banned (V5). Use pnpm run typecheck, and fix each error before the commit:";

const FROZEN_FILES = [
  "lint/boundaries.ts",
  "lint/day-one.ts",
  "lint/plugins/studio/frozen-port.js",
  "lint/plugins/studio/frozen.js",
  "lint/server-order.ts",
];

const toPairs = (text) => {
  const body = FILES_BLOCK.exec(text)?.groups.body ?? "";
  const files = [...body.matchAll(FILE_ROW)].map((found) => found.groups.file);
  const pairs = new Set();

  for (const { groups } of text.matchAll(RULE_ROW)) {
    for (const hit of groups.hits.split(",").filter(Boolean)) {
      pairs.add(`${groups.name} ${files[Number(hit)]}`);
    }
  }

  return pairs;
};

const dayOnePairs = rule((context) => ({
  Program: (node) => {
    const committed = committedTextOf(DAY_ONE);

    if (committed === null) {
      return;
    }

    const before = toPairs(committed);
    const added = [...toPairs(context.sourceCode.text)].filter((pair) => !before.has(pair));

    if (added.length > 0) {
      context.report({ message: `${PAIRS_MESSAGE} ${added.length} new, first: ${added[0]}.`, node });
    }
  },
}));

const noZodBridge = rule((context) => ({
  ImportDeclaration: (node) => {
    const relative = relativeOf(context.filename);

    if (ZOD_BRIDGE.test(String(node.source.value)) && !ZOD_BRIDGE_FILES.has(relative)) {
      context.report({ message: BRIDGE_MESSAGE, node: node.source });
    }
  },
}));

const toTarget = (context, source) => relativeOf(path.resolve(path.dirname(context.filename), source));

const areaOf = (relative) => SERVER_FILE.exec(relative)?.groups.area ?? null;

const isPastIndex = (context, source) => {
  if (!source.startsWith("../")) {
    return false;
  }

  const target = toTarget(context, source);
  const area = areaOf(target);

  if (!TARGET_AREAS.has(area) || area === areaOf(relativeOf(context.filename))) {
    return false;
  }

  return !TARGET_INDEX.test(target) && !AGGREGATOR_TARGETS.has(target);
};

const areaTargetIndex = rule((context) => {
  const check = (node) => {
    const source = String(node.source?.value ?? "");

    if (isPastIndex(context, source)) {
      context.report({ message: TARGET_MESSAGE, node: node.source });
    }
  };

  return { ExportNamedDeclaration: check, ImportDeclaration: check };
});

const noPreviewBarrel = rule((context) => ({
  ImportDeclaration: (node) => {
    const source = String(node.source.value);

    if (node.importKind !== "type" && source.startsWith(".") && PREVIEW_BARREL.test(toTarget(context, source))) {
      context.report({ message: BARREL_MESSAGE, node: node.source });
    }
  },
}));

const isDecodeName = (name) => {
  if (name === null || !DECODE_CALL.test(name)) {
    return false;
  }

  return !NOT_READ_LIST.test(name);
};

const decodeOwner = rule((context) => ({
  CallExpression: (node) => {
    const { callee } = node;

    if (callee.type !== "MemberExpression" || lastName(callee.object) !== "Schema") {
      return;
    }

    if (isDecodeName(lastName(callee))) {
      context.report({ message: DECODE_MESSAGE, node });
    }
  },
}));

const SEAM_FILE = /^(?:index|deps)\.[a-z]+$/u;

const isReexport = (node) =>
  node.type === "ExportAllDeclaration" || (node.type === "ExportNamedDeclaration" && node.source !== null);

const isLocalExportBlock = (node) =>
  node.type === "ExportNamedDeclaration" && node.source === null && node.declaration === null;

const isShimBody = (body) => {
  if (body.every((node) => isReexport(node))) {
    return true;
  }

  return (
    body.some((node) => isLocalExportBlock(node)) &&
    body.every((node) => node.type === "ImportDeclaration" || isReexport(node) || isLocalExportBlock(node))
  );
};

const noExportOnlyFile = rule((context) => ({
  Program: (program) => {
    const name = path.basename(context.filename);

    if (SEAM_FILE.test(name) || SHIM_FILES.has(relativeOf(context.filename)) || program.body.length === 0) {
      return;
    }

    if (isShimBody(program.body)) {
      context.report({ message: SHIM_MESSAGE, node: program });
    }
  },
}));

const sourceText = (file) => {
  const full = path.join(ROOT, file);

  if (!existsSync(full)) {
    return "";
  }

  return readFileSync(full, "utf-8");
};

const declared = { names: null };

const DECLARED_LIST = /const (?<name>[A-Z][A-Z0-9_]+)\b/gu;

const toDeclaredLists = () => {
  if (declared.names === null) {
    declared.names = new Set(
      FROZEN_FILES.flatMap((file) => [...sourceText(file).matchAll(DECLARED_LIST)].map((found) => found.groups.name))
    );
  }

  return declared.names;
};

const frozenListLive = rule((context) => ({
  Literal: (node) => {
    const array = node.parent;
    const holder = array?.parent;

    if (array?.type !== "ArrayExpression" || holder?.type !== "NewExpression") {
      return;
    }

    if (holder.parent?.id?.name === "FROZEN_LISTS" && !toDeclaredLists().has(node.value)) {
      context.report({ message: LIST_MESSAGE, node });
    }
  },
}));

const tsc = { lines: null, wasReported: false };

const { env } = process;

const isCommitRun = () => (env.GIT_INDEX_FILE ?? env.STUDIO_LINT_TYPECHECK ?? "") !== "" && existsSync(TSC);

const toTscLines = () => {
  if (tsc.lines === null) {
    try {
      execFileSync(TSC, ["-b", "tsconfig.json", "--pretty", "false"], {
        cwd: ROOT,
        encoding: "utf-8",
        maxBuffer: TSC_BUFFER,
        stdio: ["ignore", "pipe", "pipe"],
      });
      tsc.lines = [];
    } catch (error) {
      tsc.lines = String(error.stdout ?? "").split("\n").filter(Boolean);
    }
  }

  return tsc.lines;
};

const typecheckClean = rule((context) => ({
  Program: (node) => {
    if (tsc.wasReported || !isCommitRun()) {
      return;
    }

    const lines = toTscLines();

    if (lines.length > 0) {
      tsc.wasReported = true;
      context.report({ message: `${TSC_MESSAGE} ${lines.slice(0, MAX_TSC_LINES).join(" | ")}`, node });
    }
  },
}));

const reachRules = {
  ...portRules,
  "area-target-index": areaTargetIndex,
  "day-one-pairs": dayOnePairs,
  "decode-owner": decodeOwner,
  "frozen-list-live": frozenListLive,
  "no-export-only-file": noExportOnlyFile,
  "no-optional-null": noOptionalNull,
  "no-preview-barrel": noPreviewBarrel,
  "no-zod-bridge": noZodBridge,
  "typecheck-clean": typecheckClean,
};

export { reachRules };
