import { toClauseOf, toImportClauses, toImportLine } from "./import-scan.js";
import { toMarkupText, toTextElement } from "./markup.js";
import type { MarkupAttribute, MarkupElement } from "./markup.js";
import { toJoinedPath, toRelativeSpecifier } from "./path-ops.js";

const HEADER_TAG =
  /<(?<name>[A-Z][A-Za-z0-9]*(?:Header|Heading|Title))\b(?<props>[^<>]*?)(?<close>\/?)>/gu;

const H1_TAG = /<h1\b(?<attrs>[^<>]*)>/u;

const STRING_PROP = /\b(?<name>[A-Za-z][\w-]*)="(?<value>[^"\n]*)"/gu;

const CLASS_PROP = /className="(?<value>[^"\n]*)"/u;

const TITLE_PROPS: ReadonlySet<string> = new Set([
  "title",
  "heading",
  "name",
  "label",
  "text",
]);

const FALLBACK_CLASS = "text-2xl font-semibold tracking-tight";

interface HeadingPlan {
  readonly imports: readonly string[];
  readonly jsx: string;
}

interface HeadingScope {
  readonly fromDir: string;
  readonly title: string;
  readonly toDir: string;
}

const toCleanTitle = (title: string): string =>
  title.replaceAll(/[{}<>]/gu, "").trim();

const toRewrittenSource = (source: string, scope: HeadingScope): string => {
  if (!source.startsWith(".")) {
    return source;
  }

  return toRelativeSpecifier(scope.toDir, toJoinedPath(scope.fromDir, source));
};

const toStringProps = (props: string): readonly MarkupAttribute[] =>
  [...props.matchAll(STRING_PROP)].map((match) => [
    match.groups?.name ?? "",
    match.groups?.value ?? "",
  ]);

const toTitledProps = (
  props: readonly MarkupAttribute[],
  title: string
): readonly MarkupAttribute[] =>
  props.map(([name, value]) => {
    if (TITLE_PROPS.has(name)) {
      return [name, title];
    }

    return [name, value];
  });

const toHeadingJsx = (
  name: string,
  props: readonly MarkupAttribute[],
  text: string
): string => {
  const children: readonly MarkupElement[] = [];
  const isVoid = text === "";
  const tag = name;

  return toMarkupText([{ attrs: props, children, isVoid, tag, text }], "jsx");
};

const toKitHeading = (
  code: string,
  scope: HeadingScope
): HeadingPlan | null => {
  const clauses = toImportClauses(code);
  const title = toCleanTitle(scope.title);

  for (const match of code.matchAll(HEADER_TAG)) {
    const name = match.groups?.name ?? "";
    const clause = toClauseOf(clauses, name);

    if (clause !== null) {
      const props = toStringProps(match.groups?.props ?? "");
      const hasTitle = props.some(([prop]) => TITLE_PROPS.has(prop));
      const isSelfClosed = match.groups?.close === "/" && hasTitle;
      const source = toRewrittenSource(clause.source, scope);
      const imports = [toImportLine(clause, name, source)];

      if (isSelfClosed) {
        return {
          imports,
          jsx: toHeadingJsx(name, toTitledProps(props, title), ""),
        };
      }

      return { imports, jsx: toHeadingJsx(name, props, title) };
    }
  }

  return null;
};

const toPlainHeading = (code: string, title: string): HeadingPlan => {
  const attributes = H1_TAG.exec(code)?.groups?.attrs ?? "";
  const className = CLASS_PROP.exec(attributes)?.groups?.value ?? "";
  const used = className || FALLBACK_CLASS;
  const heading = toTextElement("h1", { class: used }, toCleanTitle(title));

  return { imports: [], jsx: toMarkupText([heading], "jsx") };
};

const toHeadingPlan = (code: string, scope: HeadingScope): HeadingPlan =>
  toKitHeading(code, scope) ?? toPlainHeading(code, scope.title);

export { toCleanTitle, toHeadingPlan };

export type { HeadingPlan, HeadingScope };
