import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const CLOUD = "apps/api/src";
const SERVER = "apps/desktop/src/server";
const GLOB_TAIL = "/**";
const SOURCE_FILE = /\.(?<ext>ts|tsx|mts|mjs|js)$/u;
const SKIPPED_FILE = /\.(?<kind>test|spec)\.(?<ext>ts|tsx)$/u;
const SCRIPT_SUFFIX = /\.(?<ext>js|ts|mjs)$/u;
const IMPORT_SPEC = /(?:from\s+|import\s*\(\s*)["'](?<spec>[^"']+)["']/gu;
const RESPONSE_BUILDER = /\b(?:json|text|body|html)\s*\(|new Response\(/u;
const SECRET_WORD = /Bearer|\bjwt\b|ds_mcp_/u;
const REQUEST_ORG_ID = /c\.req\.(?:json|query)\b.*orgId|orgId\s*:\s*Schema\./u;
const APP_REQUEST = /\bapp\.request\(/gu;
const PRINCIPAL_ARG = /\bprincipal\b/u;
const SETTING_SOURCES = /settingSources\s*:/u;
const EMPTY_SETTING_SOURCES = /settingSources\s*:\s*\[\s*\]/u;
const DYNAMIC_ACCESS = /dynamicAccessControl/u;
const DYNAMIC_ACCESS_OFF = /dynamicAccessControl\s*:\s*\{\s*enabled\s*:\s*false\s*\}/u;
const BANNED_AUTH_FLAG = /enableSessionForAPIKeys\s*:\s*true|disableCSRFCheck|disableOriginCheck/u;

const toPosix = (filePath) => filePath.split(path.sep).join("/");

const isDirectory = async (folder) => {
  try {
    const info = await stat(path.join(ROOT, folder));

    return info.isDirectory();
  } catch {
    return false;
  }
};

const toSourcePath = (entry) => {
  const filePath = toPosix(path.relative(ROOT, path.join(entry.parentPath, entry.name)));
  const isSource = entry.isFile() && SOURCE_FILE.test(filePath);
  const isSkipped = SKIPPED_FILE.test(filePath) || filePath.includes("/node_modules/");

  return [filePath].filter(() => isSource && !isSkipped);
};

const listFiles = async (folder) => {
  const entries = await readdir(path.join(ROOT, folder), { recursive: true, withFileTypes: true });

  return entries.flatMap((entry) => toSourcePath(entry));
};

const isAllowed = (filePath, allowed) =>
  allowed.some((entry) => {
    if (entry.endsWith(GLOB_TAIL)) {
      return filePath.startsWith(entry.slice(0, 1 - GLOB_TAIL.length));
    }

    return filePath === entry;
  });

const toImportTarget = (filePath, specifier) => {
  if (!specifier.startsWith(".")) {
    return specifier;
  }

  const absolute = path.resolve(ROOT, path.dirname(filePath), specifier);
  const target = toPosix(path.relative(ROOT, absolute));

  return target.replace(SCRIPT_SUFFIX, "");
};

const importsTarget = (target) => (line, filePath) =>
  [...line.matchAll(IMPORT_SPEC)].some(
    (match) => toImportTarget(filePath, match.groups.spec) === target
  );

const matchesAny = (patterns) => (line) => patterns.some((pattern) => pattern.test(line));

const toLineNumber = (text, offset) => text.slice(0, offset).split("\n").length;

const toCallText = (text, start) => {
  const open = text.indexOf("(", start);
  let depth = 0;

  for (let at = open; at < text.length; at += 1) {
    depth += Number(text[at] === "(") - Number(text[at] === ")");

    if (depth === 0) {
      return text.slice(start, at + 1);
    }
  }

  return text.slice(start);
};

const findBareAppRequests = (text) =>
  [...text.matchAll(APP_REQUEST)].flatMap((match) => {
    const hasPrincipal = PRINCIPAL_ARG.test(toCallText(text, match.index));

    return [toLineNumber(text, match.index)].filter(() => !hasPrincipal);
  });

const RULES = [
  {
    allowed: [
      `${CLOUD}/platform/**`,
      `${CLOUD}/tenant/sql.ts`,
      `${CLOUD}/tenant/db.ts`,
      `${CLOUD}/tenant/viewer-db.ts`,
      `${CLOUD}/tenant/resolver.ts`,
      `${CLOUD}/tenant/sweep-db.ts`,
      `${CLOUD}/auth/gateway.ts`,
      `${CLOUD}/auth/member-roles.ts`,
    ],
    fix: "Run SQL through TenantDb with a tq statement in tenant/repos/<table>.ts.",
    id: "B1",
    matches: matchesAny([
      /\.prepare\(/u,
      /\.exec\(/u,
      /\.batch\(/u,
      /\benv\.(?:DB|FILES|RATE)\b/u,
      /\bD1Database\b/u,
    ]),
    message: "raw D1 access or a binding read outside the tenant gate",
    roots: [CLOUD],
  },
  {
    allowed: [`${CLOUD}/tenant/repos/**`, `${CLOUD}/tenant/probes/**`],
    fix: "Move the tq statement into apps/api/src/tenant/repos/<table>.ts.",
    id: "B2",
    matches: matchesAny([/\btq`/u]),
    message: "tq statement outside tenant/repos",
    roots: [CLOUD],
  },
  {
    allowed: [`${CLOUD}/http/middleware/viewer.ts`],
    fix: "Read share and public scope from ViewerScope. Only http/middleware/viewer.ts imports tenant/resolver.",
    id: "B3",
    matches: importsTarget(`${CLOUD}/tenant/resolver`),
    message: "import of tenant/resolver",
    roots: [CLOUD],
  },
  {
    allowed: [`${CLOUD}/tenant/blobs.ts`, `${CLOUD}/platform/**`],
    fix: "Use TenantBlobs from apps/api/src/tenant/blobs.ts.",
    id: "B4",
    matches: matchesAny([
      /\b(?:files|FILES|bucket|r2)\.(?:get|put|delete|list|head)\(/u,
      /\bR2Bucket\b/u,
    ]),
    message: "R2 bucket call outside TenantBlobs",
    roots: [CLOUD],
  },
  {
    allowed: [`${CLOUD}/http/middleware/**`],
    fix: "Read the principal from CurrentUser. Only http/middleware calls getSession.",
    id: "B5",
    matches: matchesAny([/\bgetSession\(/u]),
    message: "getSession call outside http/middleware",
    roots: [CLOUD],
  },
  {
    allowed: [],
    fix: "Take orgId only from the path param. Use CurrentOrg in the handler.",
    id: "B6",
    matches: matchesAny([REQUEST_ORG_ID]),
    message: "orgId read from a request body, query or schema",
    roots: [`${CLOUD}/http/groups`],
  },
  {
    allowed: [],
    fix: "Never put a bearer token, JWT or ds_mcp_ key in a response body.",
    id: "B7",
    matches: (line) => RESPONSE_BUILDER.test(line) && SECRET_WORD.test(line),
    message: "credential text in a response body builder",
    roots: [`${SERVER}/http`],
  },
  {
    allowed: [`${SERVER}/store/**`, `${SERVER}/cloud/migrate.ts`],
    fix: "Read bindings through the store. Only apps/desktop/src/server/store and cloud/migrate.ts import store/bindings.",
    id: "B8",
    matches: importsTarget(`${SERVER}/store/bindings`),
    message: "import of store/bindings",
    roots: [SERVER],
  },
  {
    allowed: [],
    fix: "Pass a third { principal } argument to app.request.",
    id: "B9",
    matchesFile: findBareAppRequests,
    message: "app.request without a principal",
    pending: [`${SERVER}/http/mcp-routes.ts`],
    roots: [SERVER],
  },
  {
    allowed: [],
    fix: "Set settingSources: [] on every agent query.",
    id: "B10",
    matches: (line) => SETTING_SOURCES.test(line) && !EMPTY_SETTING_SOURCES.test(line),
    message: "settingSources is not []",
    roots: [SERVER],
  },
  {
    allowed: [],
    fix: "Keep enableSessionForAPIKeys false, dynamicAccessControl { enabled: false }, and the CSRF and origin checks on.",
    id: "B11",
    matches: (line) =>
      BANNED_AUTH_FLAG.test(line) || (DYNAMIC_ACCESS.test(line) && !DYNAMIC_ACCESS_OFF.test(line)),
    message: "banned Better Auth option",
    roots: [CLOUD, SERVER],
  },
  {
    allowed: [`${CLOUD}/http/middleware/**`],
    fix: "Let MemberAuth or AgentAuth middleware provide CurrentOrg.",
    id: "B12",
    matches: matchesAny([/provideService\(\s*CurrentOrg\b/u]),
    message: "CurrentOrg provided outside http/middleware",
    roots: [CLOUD],
  },
];

const toMatchedLines = (rule, filePath, text) => {
  if (rule.matchesFile) {
    return rule.matchesFile(text);
  }

  return text
    .split("\n")
    .flatMap((line, index) => [index + 1].filter(() => rule.matches(line, filePath)));
};

const scanFile = async (rule, scannedPath) => {
  const isPendingPath = isAllowed(scannedPath, rule.pending ?? []);
  const text = await readFile(path.join(ROOT, scannedPath), "utf-8");

  return toMatchedLines(rule, scannedPath, text).map((lineNumber) => ({
    filePath: scannedPath,
    fix: rule.fix,
    id: rule.id,
    isPending: isPendingPath,
    line: lineNumber,
    message: rule.message,
  }));
};

const scanRule = async (rule) => {
  const present = await Promise.all(rule.roots.map((root) => isDirectory(root)));
  const roots = rule.roots.filter((_root, index) => present[index]);

  if (roots.length < rule.roots.length) {
    return {
      failures: rule.roots.flatMap((root, index) => {
        if (present[index]) {
          return [];
        }

        return [
          {
            filePath: root,
            fix: "Repoint the rule root in scripts/check-tenant-boundary.mjs to the folder that holds this code.",
            id: rule.id,
            isPending: false,
            line: 0,
            message: "target folder is missing",
          },
        ];
      }),
      id: rule.id,
    };
  }

  const files = await Promise.all(roots.map((root) => listFiles(root)));
  const scanned = files.flat().filter((filePath) => !isAllowed(filePath, rule.allowed));
  const failures = await Promise.all(scanned.map((filePath) => scanFile(rule, filePath)));

  return { failures: failures.flat(), id: rule.id };
};

const writeLine = (line) => process.stdout.write(`${line}\n`);

const run = async () => {
  const results = await Promise.all(RULES.map((rule) => scanRule(rule)));
  const found = results.flatMap((result) => result.failures);
  const failures = found.filter((failure) => !failure.isPending);

  for (const failure of found.filter((entry) => entry.isPending)) {
    writeLine(`${failure.filePath}:${failure.line} ${failure.id} pending: ${failure.message}`);
  }

  for (const failure of failures) {
    writeLine(`${failure.filePath}:${failure.line} ${failure.id} ${failure.message}`);
    writeLine(`  fix: ${failure.fix}`);
  }

  if (failures.length > 0) {
    writeLine(`check-tenant-boundary: ${failures.length} failure(s)`);
    writeLine("fix: move the code to its allowed path, then run pnpm run check:tenant");
    process.exitCode = 1;

    return;
  }

  writeLine(`check-tenant-boundary: ok (${RULES.length} rules)`);
};

await run();
