import {
  isInsideFolder,
  toJoinedPath,
  toRelativeSpecifier,
} from "./path-ops.js";

const IMPORT_PATTERN =
  /(?<lead>\b(?:from|import)[\s(]*)(?<quote>["'])(?<specifier>\.{1,2}(?:\/[^"'\n]*)?)["']/gu;

const COPIED_NAMES: ReadonlySet<string> = new Set([
  "page",
  "loading",
  "error",
  "not-found",
  "template",
]);

const EXTENSION_PATTERN = /\.[A-Za-z0-9]+$/u;

interface RewriteScope {
  readonly fromDir: string;
  readonly sourceFolder: string;
  readonly toDir: string;
}

const isCopiedName = (rest: string): boolean => {
  const [first = ""] = rest.split("/");

  if (first.startsWith("_")) {
    return true;
  }

  return (
    !rest.includes("/") &&
    COPIED_NAMES.has(first.replace(EXTENSION_PATTERN, ""))
  );
};

const toRewrittenSpecifier = (
  specifier: string,
  scope: RewriteScope
): string => {
  const target = toJoinedPath(scope.fromDir, specifier);
  const rest = target.slice(scope.sourceFolder.length + 1);

  if (isInsideFolder(scope.sourceFolder, target) && isCopiedName(rest)) {
    return specifier;
  }

  const relative = toRelativeSpecifier(scope.toDir, target);

  if (relative === "./") {
    return ".";
  }

  return relative;
};

const toRewrittenImports = (code: string, scope: RewriteScope): string =>
  code.replaceAll(IMPORT_PATTERN, (...args: readonly unknown[]) => {
    const groups = args.at(-1) as Readonly<Record<string, string>>;
    const { lead = "", quote = '"', specifier = "" } = groups;

    return `${lead}${quote}${toRewrittenSpecifier(specifier, scope)}${quote}`;
  });

export { isCopiedName, toRewrittenImports };

export type { RewriteScope };
