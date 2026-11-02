import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { ROOT } from "./gen-common.js";
import { exists, planAction } from "./stamp/action-checks.js";
import type { ActionPlan } from "./stamp/action-checks.js";
import { readActionIndex } from "./stamp/action-index.js";
import { fail, hasFlag, parseArgs, runCli } from "./stamp/args.js";
import type { ArgsSpec, FlagSpec, ParsedArgs } from "./stamp/args.js";
import { checkDomain, checkVerb, deriveNames } from "./stamp/names.js";
import type { DerivedNames } from "./stamp/names.js";
import { actionDefinition, actionHandler, uiHook } from "./stamp/templates.js";
import { stamp, unstamp } from "./stamp/write.js";
import type { StampFile, StampResult } from "./stamp/write.js";

const COMMAND = "pnpm run new:action";

const optional = (kind: FlagSpec["kind"]): FlagSpec => ({
  kind,
  required: false,
});

const must = (kind: FlagSpec["kind"]): FlagSpec => ({ kind, required: true });

const STAMP_SPEC: ArgsSpec = {
  command: COMMAND,
  flags: {
    access: must("string"),
    agent: optional("string"),
    "agent-lean": optional("boolean"),
    "agent-off": optional("string"),
    "agent-set": optional("string"),
    "agent-short": optional("string"),
    confirm: optional("string"),
    description: must("string"),
    "dry-run": optional("boolean"),
    errors: optional("list"),
    invalidates: optional("list"),
    list: optional("boolean"),
    mcp: optional("string"),
    "mcp-off": optional("string"),
    method: optional("string"),
    needs: must("string"),
    path: must("string"),
    scope: must("string"),
    ui: optional("string"),
  },
  positionals: ["domain", "verb"],
};

const REMOVE_SPEC: ArgsSpec = {
  command: `${COMMAND} --remove`,
  flags: { remove: optional("boolean") },
  positionals: ["domain", "verb"],
};

const refuse = (error: string | null): void => {
  if (error === null) {
    return;
  }

  const [message = error, fix = COMMAND] = error.split(" fix: ");

  fail(message, fix);
};

const hookFile = (feature: string, names: DerivedNames): string =>
  `src/ui/features/${feature}/use-${names.tail}.ts`;

const stampFiles = (plan: ActionPlan): StampFile[] => {
  const { definition, feature } = plan;
  const { names } = definition;

  const files: StampFile[] = [
    { path: names.definitionFile, text: actionDefinition(definition) },
    {
      path: names.handlerFile,
      text: actionHandler({
        body: null,
        imports: [],
        inputName: "_input",
        names: definition.names,
        preview: definition.confirm === "user",
      }),
    },
  ];

  if (feature !== null) {
    files.push({
      path: hookFile(feature, names),
      text: uiHook({ access: definition.access, names }),
    });
  }

  return files;
};

const readNames = async (
  args: ParsedArgs,
  isDryRun: boolean
): Promise<{ readonly isRestamp: boolean; readonly names: DerivedNames }> => {
  const [domain = "", verb = ""] = args.positionals;

  refuse(checkDomain(domain));

  const names = deriveNames(domain, verb);

  const isRestamp =
    isDryRun && (await exists(path.join(ROOT, names.definitionFile)));

  if (!isRestamp) {
    refuse(checkVerb(verb).error);
  }

  return { isRestamp, names };
};

const printList = (title: string, files: readonly string[]): void => {
  if (files.length > 0) {
    const rows = files.map((file) => `  ${file}`);

    process.stdout.write(`${[title, ...rows].join("\n")}\n`);
  }
};

const nextSteps = (names: DerivedNames): string[] => [
  "Next steps:",
  `  1. Fill input and output in ${names.definitionFile}.`,
  `  2. Replace the stub body in ${names.handlerFile}. Yield one domain service. If none fits: pnpm run new:service <area> <Name> --access read|write.`,
  "  3. Remove NotImplemented from errors, and add the real error tags.",
  "  4. For an edit action, check invalidates.",
  "  5. Run pnpm run typecheck, pnpm run typecheck:tsrs and pnpm run lint:gate.",
  "  6. Start the app: STUDIO_AGENT=mock STUDIO_DATA_DIR=$(mktemp -d) pnpm run dev.",
  `  7. Run pnpm exec tsx scripts/call-action.ts ${names.id} '<json>'.`,
  "  8. Click the action in the UI, and send one agent prompt.",
];

const report = (
  result: StampResult,
  title: string,
  extra: readonly string[]
): void => {
  printList(title, result.written);
  printList("Regenerated:", result.generated);

  if (extra.length > 0) {
    process.stdout.write(`${extra.join("\n")}\n`);
  }
};

const runStamp = async (argv: readonly string[]): Promise<void> => {
  const args = parseArgs(STAMP_SPEC, argv);
  const isDryRun = hasFlag(args, "dry-run");
  const { isRestamp, names } = await readNames(args, isDryRun);
  const index = await readActionIndex();
  const plan = await planAction({ args, index, isRestamp, names });

  for (const warning of plan.warnings) {
    process.stderr.write(`${warning}\n`);
  }

  const result = await stamp(stampFiles(plan), { isDryRun });

  if (isDryRun) {
    return;
  }

  report(result, "Wrote:", nextSteps(names));
};

const hookFiles = async (names: DerivedNames): Promise<string[]> => {
  const features = await readdir(path.join(ROOT, "src/ui/features"), {
    withFileTypes: true,
  });

  const candidates = features
    .filter((entry) => entry.isDirectory())
    .map((entry) => hookFile(entry.name, names));

  const sources = await Promise.all(
    candidates.map(async (file) => {
      if (await exists(path.join(ROOT, file))) {
        return readFile(path.join(ROOT, file), "utf-8");
      }

      return "";
    })
  );

  return candidates.filter((_file, index) =>
    (sources[index] ?? "").includes(`routes.${names.constName}`)
  );
};

const runRemove = async (argv: readonly string[]): Promise<void> => {
  const args = parseArgs(REMOVE_SPEC, argv);
  const [domain = "", verb = ""] = args.positionals;

  refuse(checkDomain(domain));

  const names = deriveNames(domain, verb);

  if (!(await exists(path.join(ROOT, names.definitionFile)))) {
    fail(
      `The action ${names.id} has no file ${names.definitionFile}.`,
      "check the domain and the verb"
    );
  }

  const files = [
    names.definitionFile,
    names.handlerFile,
    ...(await hookFiles(names)),
  ];

  report(await unstamp(files), "Removed:", []);
};

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2);

  if (argv.includes("--remove")) {
    await runRemove(argv);

    return;
  }

  await runStamp(argv);
};

await runCli(main);
