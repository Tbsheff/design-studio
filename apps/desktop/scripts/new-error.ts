import path from "node:path";

import { readOrEmpty } from "./gen-common.js";
import {
  fail,
  hasFlag,
  listFlag,
  must,
  optional,
  parseArgs,
  runCli,
  stringFlag,
} from "./stamp/args.js";
import type { ArgsSpec } from "./stamp/args.js";
import { checkClassName, checkKebab, parseField } from "./stamp/checks.js";
import { hasStatusRow, insertStatusRow } from "./stamp/inserts.js";
import { kebab } from "./stamp/names.js";
import { report } from "./stamp/report.js";
import { domainStatus, error as errorClass } from "./stamp/templates.js";
import { exists, stampPlan } from "./stamp/write.js";
import type { StampFile, StampPlan } from "./stamp/write.js";
import { WORKSPACE_ROOT } from "./workspace-root.ts";

const SPEC: ArgsSpec = {
  command: "pnpm run new:error",
  flags: {
    "dry-run": optional("boolean"),
    field: optional("list"),
    status: must("string"),
  },
  positionals: ["domain", "ClassName"],
};

const CORE = "_core";

const STATUSES: ReadonlySet<string> = new Set([
  "400",
  "401",
  "403",
  "404",
  "409",
  "422",
  "429",
  "502",
  "503",
]);

const errorsDir = (domain: string): string =>
  `packages/common/actions/src/${domain}/errors`;

const checkOwner = async (domain: string): Promise<void> => {
  if (domain !== CORE) {
    checkKebab("domain", domain);
  }

  if (
    !(await exists(
      path.join(WORKSPACE_ROOT, "packages/common/actions/src", domain)
    ))
  ) {
    fail(
      `The domain ${domain} has no folder packages/common/actions/src/${domain}.`,
      `pnpm run new:domain ${domain}`
    );
  }
};

const readStatus = (value: string | null): number => {
  if (value === null || !STATUSES.has(value)) {
    return fail(
      `The status "${String(value)}" is not allowed.`,
      `use one of ${[...STATUSES].join(", ")}`
    );
  }

  return Number(value);
};

const statusSource = async (
  domain: string,
  file: string
): Promise<{ readonly isNew: boolean; readonly text: string }> => {
  const text = await readOrEmpty(path.join(WORKSPACE_ROOT, file));

  if (text !== "") {
    return { isNew: false, text };
  }

  return { isNew: true, text: domainStatus(domain) };
};

const withRow = (source: string, className: string, status: number): string => {
  const text = insertStatusRow(source, className, status);

  if (text === null) {
    return fail(
      "The stamp cannot find the status object in errors/status.ts.",
      "make the file match golden/error-status.ts"
    );
  }

  return text;
};

const errorPlan = async (
  domain: string,
  className: string,
  error: { readonly fields: readonly string[]; readonly status: number }
): Promise<StampPlan> => {
  const errorPath = `${errorsDir(domain)}/${kebab(className)}.ts`;
  const statusPath = `${errorsDir(domain)}/status.ts`;
  const source = await statusSource(domain, statusPath);

  if (
    (await exists(path.join(WORKSPACE_ROOT, errorPath))) ||
    hasStatusRow(source.text, className)
  ) {
    fail(`The error ${className} exists in ${domain}.`, "pick another name");
  }

  const fields = error.fields.map((entry) => parseField(entry));

  const status: StampFile = {
    path: statusPath,
    text: withRow(source.text, className, error.status),
  };

  const created: StampFile[] = [
    { path: errorPath, text: errorClass({ className, fields }) },
  ];

  if (source.isNew) {
    return { created: [...created, status], edited: [] };
  }

  return { created, edited: [status] };
};

const main = async (): Promise<void> => {
  const args = parseArgs(SPEC, process.argv.slice(2));
  const [domain = "", className = ""] = args.positionals;
  const isDryRun = hasFlag(args, "dry-run");

  await checkOwner(domain);
  checkClassName(className);

  const plan = await errorPlan(domain, className, {
    fields: listFlag(args, "field"),
    status: readStatus(stringFlag(args, "status")),
  });

  const result = await stampPlan(plan, { isDryRun });

  if (!isDryRun) {
    report(result, [
      `Add ${className} to the errors of each action that fails with it.`,
    ]);
  }
};

await runCli(main);
