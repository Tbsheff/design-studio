import path from "node:path";

import { ROOT, pascal } from "./gen-common.js";
import { fail, hasFlag, optional, parseArgs, runCli } from "./stamp/args.js";
import type { ArgsSpec } from "./stamp/args.js";
import { checkKebab } from "./stamp/checks.js";
import { report } from "./stamp/report.js";
import {
  uiComponent,
  uiCopy,
  uiFeatureIndex,
  uiModel,
} from "./stamp/templates.js";
import { exists, stampPlan } from "./stamp/write.js";
import type { StampFile } from "./stamp/write.js";

const SPEC: ArgsSpec = {
  command: "pnpm run new:feature",
  flags: { "dry-run": optional("boolean"), panel: optional("boolean") },
  positionals: ["name"],
};

const featureFiles = (name: string): StampFile[] => {
  const component = `${pascal(name)}Panel`;
  const dir = `src/ui/features/${name}`;

  return [
    { path: `${dir}/index.ts`, text: uiFeatureIndex(component) },
    {
      path: `${dir}/copy.ts`,
      text: uiCopy([{ key: "title", text: pascal(name) }]),
    },
    { path: `${dir}/${name}-panel.tsx`, text: uiComponent(component) },
    { path: `${dir}/${name}-model.ts`, text: uiModel(name) },
  ];
};

const nextSteps = (name: string): string[] => [
  "Next steps:",
  `  1. Add this line in src/ui/app: import { ${pascal(name)}Panel } from "../features/${name}/index.js";`,
  "  2. Run pnpm run build:ui && pnpm exec tsx scripts/check-bundle.ts.",
];

const main = async (): Promise<void> => {
  const args = parseArgs(SPEC, process.argv.slice(2));
  const [name = ""] = args.positionals;
  const isDryRun = hasFlag(args, "dry-run");

  checkKebab("feature name", name);

  if (await exists(path.join(ROOT, "src/ui/features", name))) {
    fail(`The folder src/ui/features/${name} exists.`, "pick another name");
  }

  const result = await stampPlan(
    { created: featureFiles(name), edited: [] },
    { isDryRun }
  );

  if (!isDryRun) {
    report(result, nextSteps(name));
  }
};

await runCli(main);
