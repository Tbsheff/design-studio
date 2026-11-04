import type { Project } from "@design-studio/actions/_core/contracts";
import { searchComponents } from "../components/component-search.js";
import { tailwindClassesFor } from "../direct-edit/engine/index.js";
import type { TailwindTheme } from "../direct-edit/tailwind/index.js";
import { kitCandidates, loadKitNames } from "../figma/kit-match.js";
import type { StyledNode } from "./copy-code.js";

interface ReactKit {
  importLine: (name: string) => Promise<string>;
  names: ReadonlySet<string>;
}

interface ReactOptions {
  kit: ReactKit | null;
  theme: TailwindTheme | null;
}

interface RenderCtx extends ReactOptions {
  used: Set<string>;
}

const ATTR_NAMES = new Map<string, string>(
  Object.entries({
    "accept-charset": "acceptCharset",
    allowfullscreen: "allowFullScreen",
    autocomplete: "autoComplete",
    autofocus: "autoFocus",
    class: "className",
    colspan: "colSpan",
    crossorigin: "crossOrigin",
    datetime: "dateTime",
    enctype: "encType",
    for: "htmlFor",
    frameborder: "frameBorder",
    "http-equiv": "httpEquiv",
    inputmode: "inputMode",
    maxlength: "maxLength",
    minlength: "minLength",
    novalidate: "noValidate",
    playsinline: "playsInline",
    readonly: "readOnly",
    referrerpolicy: "referrerPolicy",
    rowspan: "rowSpan",
    spellcheck: "spellCheck",
    srcset: "srcSet",
    tabindex: "tabIndex",
    usemap: "useMap",
  })
);

const INDENT = "  ";

const SVG_KEEP = /^(?:data-|aria-)/u;

const SVG_STYLE = /\sstyle="[^"]*"/gu;

const SVG_ATTR = /\s(?<name>[a-zA-Z][a-zA-Z0-9:-]*)=(?=")/gu;

const KIT_TOKEN = /^[A-Za-z][A-Za-z0-9-]*$/u;

const JSX_UNSAFE = /[{}<>]/u;

const SCRIPT_EXT = /\.[jt]sx?$/u;

const TAILWIND_HINT =
  /^(?:[a-z0-9-]+:)*!?-?(?:flex|grid|block|inline|hidden|p[trblxy]?|m[trblxy]?|gap|space|w|h|size|min|max|text|font|leading|tracking|bg|border|rounded|shadow|items|justify|self|place|overflow|opacity|z|top|right|bottom|left|inset|absolute|relative|fixed|sticky|ring|transition|duration|ease|cursor|object|aspect|col|row|order|basis|grow|shrink|truncate|underline|uppercase|lowercase|italic|sr-only|container|fill|stroke|outline)(?:-|$|\[)/u;

const capital = (word: string): string =>
  `${word.charAt(0).toUpperCase()}${word.slice(1)}`;

const camel = (name: string): string => {
  const [first = "", ...rest] = name.split("-");

  return `${first}${rest.map((word) => capital(word)).join("")}`;
};

const sourceTokens = (cls: string | undefined): string[] =>
  (cls ?? "")
    .split(/\s+/u)
    .filter((token) => token !== "" && !token.startsWith("studio-"));

const sourceClasses = (cls: string | undefined): string | null => {
  const tokens = sourceTokens(cls);

  if (!tokens.some((token) => TAILWIND_HINT.test(token))) {
    return null;
  }

  return tokens.join(" ");
};

const styleKey = (prop: string): string => {
  if (prop.startsWith("--")) {
    return JSON.stringify(prop);
  }

  const key = camel(prop);

  if (key.startsWith("Ms")) {
    return `ms${key.slice(2)}`;
  }

  return key;
};

const attrValue = (name: string, value: string): string => {
  if (value.includes('"')) {
    return `${name}={${JSON.stringify(value)}}`;
  }

  return `${name}="${value}"`;
};

const bareAttr = (name: string, value: string): boolean =>
  value === "" && !name.startsWith("data-") && name !== "alt";

const keepAttr = (name: string, kit: boolean): boolean =>
  !name.startsWith("on") && name !== "style" && (!kit || name !== "data-name");

const attrProps = (attrs: [string, string][], kit: boolean): string[] =>
  attrs.flatMap(([name, value]) => {
    if (!keepAttr(name, kit)) {
      return [];
    }

    const prop = ATTR_NAMES.get(name) ?? name;

    if (bareAttr(name, value)) {
      return [prop];
    }

    return [attrValue(prop, value)];
  });

const classNameOf = (node: StyledNode, theme: TailwindTheme): string | null => {
  const own = sourceClasses(node.cls);

  if (own) {
    return own;
  }

  const classes = tailwindClassesFor(
    node.styles.filter(
      ([prop, value]) => prop !== "box-sizing" || value !== "border-box"
    ),
    theme
  );

  if (classes.length === 0) {
    return null;
  }

  return classes.join(" ");
};

const styleObject = (node: StyledNode): string[] => {
  if (node.styles.length === 0) {
    return [];
  }

  const body = node.styles
    .map(([prop, value]) => `${styleKey(prop)}: ${JSON.stringify(value)}`)
    .join(", ");

  return [`style={{ ${body} }}`];
};

const styleProps = (
  node: StyledNode,
  theme: TailwindTheme | null
): string[] => {
  if (!theme) {
    return styleObject(node);
  }

  const className = classNameOf(node, theme);

  if (!className) {
    return [];
  }

  return [attrValue("className", className)];
};

const dataNameOf = (node: StyledNode): string | undefined =>
  node.attrs.find(([name]) => name === "data-name")?.[1];

const kitName = (node: StyledNode, kit: ReactKit | null): string | null => {
  if (!kit) {
    return null;
  }

  const fromName = kitCandidates([dataNameOf(node) ?? ""]);

  const fromClass = sourceTokens(node.cls).flatMap((token) => {
    if (!KIT_TOKEN.test(token)) {
      return [];
    }

    return kitCandidates([token]).slice(0, 1);
  });

  return (
    [...fromName, ...fromClass].find((name) => kit.names.has(name)) ?? null
  );
};

const svgAttr = (name: string): string => {
  if (SVG_KEEP.test(name)) {
    return name;
  }

  if (name === "class") {
    return "className";
  }

  return camel(name.replace(/^xlink:/u, "xlink-").replace(/^xml:/u, "xml-"));
};

const svgToJsx = (raw: string): string =>
  raw
    .replaceAll(SVG_STYLE, "")
    .replaceAll(SVG_ATTR, (match: string, name: string) =>
      match.replace(name, svgAttr(name))
    );

const jsxText = (text: string): string => {
  if (JSX_UNSAFE.test(text)) {
    return `{${JSON.stringify(text)}}`;
  }

  return text;
};

const propsOf = (
  node: StyledNode,
  kitTag: string | null,
  ctx: RenderCtx
): string[] => {
  const attrs = attrProps(node.attrs, kitTag !== null);

  if (kitTag) {
    return attrs;
  }

  return [...attrs, ...styleProps(node, ctx.theme)];
};

const isNode = (child: StyledNode | string): child is StyledNode =>
  child instanceof Object;

const visibleKids = (node: StyledNode): (StyledNode | string)[] =>
  node.children.filter((child) => isNode(child) || child.trim() !== "");

const renderNode = (
  node: StyledNode,
  depth: number,
  ctx: RenderCtx
): string => {
  const pad = INDENT.repeat(depth);

  if (node.raw) {
    return `${pad}${svgToJsx(node.raw)}`;
  }

  const kitTag = kitName(node, ctx.kit);

  if (kitTag) {
    ctx.used.add(kitTag);
  }

  const tag = kitTag ?? node.tag;
  const props = propsOf(node, kitTag, ctx);
  const head = ["<", tag, ...props.map((prop) => ` ${prop}`)].join("");
  const kids = visibleKids(node);
  const [only] = kids;

  if (!only) {
    return `${pad}${head} />`;
  }

  if (kids.length === 1 && !isNode(only)) {
    return `${pad}${head}>${jsxText(only.trim())}</${tag}>`;
  }

  const inner = kids.map((child) => {
    if (isNode(child)) {
      return renderNode(child, depth + 1, ctx);
    }

    return `${INDENT.repeat(depth + 1)}${jsxText(child.trim())}`;
  });

  return `${pad}${head}>\n${inner.join("\n")}\n${pad}</${tag}>`;
};

const componentName = (root: StyledNode, used: ReadonlySet<string>): string => {
  const label =
    dataNameOf(root) ??
    root.attrs.find(([name]) => name === "id")?.[1] ??
    root.tag;

  const name = kitCandidates([label])[0] ?? "Layer";

  if (used.has(name)) {
    return `${name}Layer`;
  }

  return name;
};

const importBlock = async (ctx: RenderCtx): Promise<string> => {
  const { kit } = ctx;

  if (!kit || ctx.used.size === 0) {
    return "";
  }

  const lines = await Promise.all(
    [...ctx.used].toSorted().map(async (name) => await kit.importLine(name))
  );

  return `${lines.join("\n")}\n\n`;
};

const renderReact = async (
  root: StyledNode,
  options: ReactOptions
): Promise<string> => {
  const ctx: RenderCtx = { ...options, used: new Set() };
  const body = renderNode(root, 2, ctx);
  const name = componentName(root, ctx.used);
  const head = await importBlock(ctx);

  return `${head}export function ${name}() {\n  return (\n${body}\n  );\n}\n`;
};

const searchImport = async (
  project: Project,
  workTree: string,
  name: string
): Promise<string | null> => {
  try {
    const found = await searchComponents(project, workTree, {
      limit: 10,
      query: name,
    });

    return found.components.find((item) => item.name === name)?.import ?? null;
  } catch {
    return null;
  }
};

const importLineFor = async (
  project: Project,
  workTree: string,
  name: string,
  file: string | undefined
): Promise<string> => {
  const line = await searchImport(project, workTree, name);

  if (line?.startsWith("import ")) {
    return line;
  }

  const from = (file ?? name).replace(SCRIPT_EXT, "");

  return `import { ${name} } from "./${from}";`;
};

const reactKit = async (
  project: Project,
  workTree: string
): Promise<ReactKit | null> => {
  const names = await loadKitNames(project, workTree);

  if (!names) {
    return null;
  }

  return {
    importLine: async (name) =>
      await importLineFor(project, workTree, name, names.get(name)?.file),
    names: new Set(names.keys()),
  };
};

export { reactKit, renderReact, type ReactKit, type ReactOptions };
