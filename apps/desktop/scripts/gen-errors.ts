import path from "node:path";

import {
  ACTIONS,
  CORE,
  actionTails,
  lines,
  pascal,
  readOrEmpty,
} from "./gen-common.js";
import type { GeneratedFile } from "./gen-common.js";

const ERROR_SKIP = new Set(["all", "http-status-codes", "index", "status"]);

const errorsIndex = (prefix: string, tails: string[]): string =>
  lines(
    ...tails.map((tail) => `import { ${pascal(tail)} } from "./${tail}.js";`),
    "",
    `const ${prefix}Errors = [`,
    ...tails.map((tail) => `  ${pascal(tail)},`),
    "] as const;",
    "",
    `type ${prefix}Error = InstanceType<(typeof ${prefix}Errors)[number]>;`,
    "",
    `type ${prefix}ErrorTag = ${prefix}Error["_tag"];`,
    "",
    `export { ${prefix}Errors };`,
    "",
    `export type { ${prefix}Error, ${prefix}ErrorTag };`
  );

const errorTails = (dir: string): Promise<string[]> =>
  actionTails(dir, ERROR_SKIP);

const hasStatus = async (ctx: string): Promise<boolean> =>
  Boolean(await readOrEmpty(path.join(ACTIONS, ctx, "errors", "status.ts")));

const errorDomains = async (contexts: string[]): Promise<string[]> => {
  const found = await Promise.all(contexts.map((ctx) => hasStatus(ctx)));

  return contexts.filter((_ctx, index) => Boolean(found[index]));
};

const BUILT_IN_ERRORS = new Set(["ReferenceError"]);

const toErrorPrefix = (ctx: string): string => {
  if (BUILT_IN_ERRORS.has(`${pascal(ctx)}Error`)) {
    return `${pascal(ctx)}Domain`;
  }

  return pascal(ctx);
};

const errorType = (ctx: string): string => `${toErrorPrefix(ctx)}Error`;

const errorUnion = (domains: string[]): string =>
  ["CoreError", ...domains.map((ctx) => errorType(ctx))].join(" | ");

const errorsAll = (domains: string[]): string =>
  lines(
    ...domains.map(
      (ctx) =>
        `import type { ${errorType(ctx)} } from "../../${ctx}/errors/index.js";`
    ),
    `import type { CoreError } from "./index.js";`,
    "",
    `type StudioError = ${errorUnion(domains)};`,
    "",
    `type StudioErrorTag = StudioError["_tag"];`,
    "",
    "export type { StudioError, StudioErrorTag };"
  );

const httpStatus = (domains: string[]): string =>
  lines(
    ...domains.map(
      (ctx) =>
        `import { ${pascal(ctx)}Status } from "../${ctx}/errors/status.js";`
    ),
    `import type { StudioErrorTag } from "./errors/all.js";`,
    `import type { HttpStatus } from "./errors/http-status-codes.js";`,
    `import { CoreStatus } from "./errors/status.js";`,
    "",
    "const HTTP_STATUS = {",
    "  ...CoreStatus,",
    ...domains.map((ctx) => `  ...${pascal(ctx)}Status,`),
    "  Defect: 500,",
    `} as const satisfies Record<StudioErrorTag | "Defect", HttpStatus>;`,
    "",
    `const statusOf = (tag: StudioErrorTag | "Defect"): HttpStatus =>`,
    "  HTTP_STATUS[tag];",
    "",
    "export { HTTP_STATUS, statusOf };"
  );

const domainErrorIndex = async (ctx: string): Promise<GeneratedFile> => {
  const dir = path.join(ACTIONS, ctx, "errors");

  return {
    path: path.join(dir, "index.ts"),
    text: errorsIndex(toErrorPrefix(ctx), await errorTails(dir)),
  };
};

const errorFiles = async (contexts: string[]): Promise<GeneratedFile[]> => {
  const domains = await errorDomains(contexts);
  const coreDir = path.join(ACTIONS, CORE, "errors");

  const perDomain = await Promise.all(
    domains.map((ctx) => domainErrorIndex(ctx))
  );

  return [
    {
      path: path.join(coreDir, "index.ts"),
      text: errorsIndex("Core", await errorTails(coreDir)),
    },
    { path: path.join(coreDir, "all.ts"), text: errorsAll(domains) },
    {
      path: path.join(ACTIONS, CORE, "http-status.ts"),
      text: httpStatus(domains),
    },
    ...perDomain,
  ];
};

export { errorFiles };
