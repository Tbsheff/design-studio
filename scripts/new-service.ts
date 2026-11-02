import { readFile } from "node:fs/promises";
import path from "node:path";

import { ROOT, readOrEmpty } from "./gen-common.js";
import {
  fail,
  hasFlag,
  must,
  optional,
  parseArgs,
  runCli,
  stringFlag,
} from "./stamp/args.js";
import type { ArgsSpec } from "./stamp/args.js";
import { checkClassName, checkKebab } from "./stamp/checks.js";
import { insertExportLine } from "./stamp/inserts.js";
import { kebab } from "./stamp/names.js";
import { report } from "./stamp/report.js";
import { service } from "./stamp/templates.js";
import { exists, stampPlan } from "./stamp/write.js";
import type { StampPlan } from "./stamp/write.js";

const SPEC: ArgsSpec = {
  command: "pnpm run new:service",
  flags: {
    access: must("string"),
    "dry-run": optional("boolean"),
    test: optional("boolean"),
  },
  positionals: ["area", "ClassName"],
};

const LAYERS_BLOCK = /export const LAYERS[^=]*=\s*\[(?<body>[\s\S]*?)\n\];/u;
const AREAS_LIST = /areas:\s*\[(?<list>[^\]]*)\]/gu;
const SERVER_PATH = /"src\/server\/(?<area>[a-z-]+)"/gu;
const QUOTED = /"(?<word>[a-z-]+)"/gu;

const layerAreas = async (): Promise<Set<string>> => {
  const source = await readFile(path.join(ROOT, "lint/boundaries.ts"), "utf-8");
  const body = LAYERS_BLOCK.exec(source)?.groups?.["body"] ?? "";
  const areas = new Set<string>();

  for (const match of body.matchAll(AREAS_LIST)) {
    for (const word of (match.groups?.["list"] ?? "").matchAll(QUOTED)) {
      areas.add(word.groups?.["word"] ?? "");
    }
  }

  for (const match of body.matchAll(SERVER_PATH)) {
    areas.add(match.groups?.["area"] ?? "");
  }

  return areas;
};

const checkArea = async (area: string): Promise<void> => {
  checkKebab("area", area);

  if (!(await exists(path.join(ROOT, "src/server", area)))) {
    fail(
      `The folder src/server/${area} does not exist.`,
      "pick an area folder"
    );
  }

  const areas = await layerAreas();

  if (!areas.has(area)) {
    fail(
      `The area ${area} is not in a server layer of lint/boundaries.ts LAYERS.`,
      "pick an area from LAYERS, or ask the merge step to add it"
    );
  }
};

const readAccess = (value: string | null): "read" | "write" => {
  if (value === "read" || value === "write") {
    return value;
  }

  return fail(
    `The access "${String(value)}" is not read or write.`,
    "use --access read or --access write"
  );
};

const servicePlan = async (
  area: string,
  className: string,
  spec: { readonly access: "read" | "write"; readonly test: boolean }
): Promise<StampPlan> => {
  const file = kebab(className);
  const servicePath = `src/server/${area}/${file}.ts`;
  const indexPath = `src/server/${area}/index.ts`;

  if (await exists(path.join(ROOT, servicePath))) {
    fail(`The file ${servicePath} exists.`, "pick another class name");
  }

  const index = await readOrEmpty(path.join(ROOT, indexPath));

  return {
    created: [
      {
        path: servicePath,
        text: service({ ...spec, area, className }),
      },
    ],
    edited: [
      { path: indexPath, text: insertExportLine(index, className, file) },
    ],
  };
};

const main = async (): Promise<void> => {
  const args = parseArgs(SPEC, process.argv.slice(2));
  const [area = "", className = ""] = args.positionals;
  const isDryRun = hasFlag(args, "dry-run");
  const access = readAccess(stringFlag(args, "access"));

  await checkArea(area);
  checkClassName(className);

  const plan = await servicePlan(area, className, {
    access,
    test: hasFlag(args, "test"),
  });

  const result = await stampPlan(plan, { isDryRun });

  if (!isDryRun) {
    report(result, [
      `Add ${className}.layer to src/server/handlers/<domain>/live.ts.`,
    ]);
  }
};

await runCli(main);
