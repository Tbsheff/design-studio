import path from "node:path";

import { ROOT, pascal } from "./gen-common.js";
import { fail, hasFlag, optional, parseArgs, runCli } from "./stamp/args.js";
import type { ArgsSpec } from "./stamp/args.js";
import { checkKebab } from "./stamp/checks.js";
import { report } from "./stamp/report.js";
import {
  domainLive,
  domainSchema,
  domainStatus,
  uiComponent,
  uiCopy,
  uiFeatureIndex,
} from "./stamp/templates.js";
import { exists, stampPlan } from "./stamp/write.js";
import type { StampFile } from "./stamp/write.js";

const SPEC: ArgsSpec = {
  command: "pnpm run new:domain",
  flags: { "dry-run": optional("boolean"), ui: optional("boolean") },
  positionals: ["domain"],
};

const actionsDir = (domain: string): string => `src/shared/actions/${domain}`;

const handlersDir = (domain: string): string => `src/server/handlers/${domain}`;

const featureDir = (domain: string): string => `src/ui/features/${domain}`;

const refuseTaken = async (domain: string, hasUi: boolean): Promise<void> => {
  const dirs = [actionsDir(domain), handlersDir(domain)];

  if (hasUi) {
    dirs.push(featureDir(domain));
  }

  const found = await Promise.all(
    dirs.map((dir) => exists(path.join(ROOT, dir)))
  );

  const taken = dirs.filter((_dir, index) => found[index] === true);

  if (taken.length > 0) {
    fail(
      `The domain ${domain} exists already: ${taken.join(", ")}.`,
      "pick another name, or stamp actions with pnpm run new:action"
    );
  }
};

const uiFiles = (domain: string): StampFile[] => {
  const component = `${pascal(domain)}Panel`;
  const dir = featureDir(domain);

  return [
    { path: `${dir}/index.ts`, text: uiFeatureIndex(component) },
    {
      path: `${dir}/copy.ts`,
      text: uiCopy([{ key: "title", text: pascal(domain) }]),
    },
    { path: `${dir}/${domain}-panel.tsx`, text: uiComponent(component) },
  ];
};

const domainFiles = (domain: string, hasUi: boolean): StampFile[] => {
  const files: StampFile[] = [
    { path: `${actionsDir(domain)}/schema.ts`, text: domainSchema() },
    {
      path: `${actionsDir(domain)}/errors/status.ts`,
      text: domainStatus(domain),
    },
    { path: `${handlersDir(domain)}/live.ts`, text: domainLive(domain) },
  ];

  if (hasUi) {
    files.push(...uiFiles(domain));
  }

  return files;
};

const nextSteps = (domain: string): string[] => [
  "Next steps:",
  `  1. Stamp the first action: pnpm run new:action ${domain} <verb> ...`,
  `  2. Stamp errors: pnpm run new:error ${domain} <ClassName> --status <code>.`,
  "  3. Run pnpm run typecheck and pnpm run lint:gate.",
];

const main = async (): Promise<void> => {
  const args = parseArgs(SPEC, process.argv.slice(2));
  const [domain = ""] = args.positionals;
  const hasUi = hasFlag(args, "ui");
  const isDryRun = hasFlag(args, "dry-run");

  checkKebab("domain", domain);
  await refuseTaken(domain, hasUi);

  const plan = { created: domainFiles(domain, hasUi), edited: [] };
  const result = await stampPlan(plan, { isDryRun });

  if (!isDryRun) {
    report(result, nextSteps(domain));
  }
};

await runCli(main);
