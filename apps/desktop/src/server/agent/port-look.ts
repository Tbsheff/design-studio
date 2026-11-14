import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  CompiledTokenEntry,
  Direction,
  Project,
} from "@design-studio/contracts";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { findTokenFile, safeFileInside } from "../design-system/model/index.js";
import { loadDesignSystemPromptContext } from "../design-system/state.js";
import {
  toCssFonts,
  toCustomProperties,
  toNextFonts,
  toPackDefs,
  toPrototypeFonts,
} from "./port-look-css.js";
import type { PortLookFont } from "./port-look-css.js";

type HtmlNode = DefaultTreeAdapterMap["node"];

type HtmlElement = DefaultTreeAdapterMap["element"];

interface PortLookApp {
  readonly cssFile: string | null;
  readonly entries: readonly CompiledTokenEntry[];
  readonly fonts: readonly PortLookFont[];
  readonly isNext: boolean;
  readonly isTailwind: boolean;
  readonly layoutFile: string | null;
}

interface PortLook {
  readonly app: PortLookApp | null;
  readonly defs: ReadonlyMap<string, string>;
  readonly fonts: readonly string[];
}

interface PortLookSource {
  readonly html: string;
  readonly path: string;
  readonly workTree: string;
}

interface PortLookPage {
  readonly html: string;
  readonly look: PortLook;
  readonly path: string;
}

interface PortLookTarget {
  readonly direction: Direction;
  readonly project: Project;
}

interface PortLookInput {
  readonly source: { readonly direction: Direction };
  readonly target: PortLookTarget | null;
}

interface AppLayout {
  readonly file: string;
  readonly text: string;
}

const ROUTER_DIRS = ["app", "src/app"];

const LAYOUT_NAMES = ["layout.tsx", "layout.jsx", "layout.ts", "layout.js"];

const CSS_IMPORT = /import\s+["'](?<spec>[^"']+)["']/gu;

const TAILWIND_IMPORT = /@import\s+(?:url\()?["']tailwindcss[/"']/u;

const EXTERNAL_HREF = /^(?:[a-z][\w+.-]*:|\/\/)/iu;

const PACK_FILE = "design-system/pack.json";

const isElementNode = (node: HtmlNode): node is HtmlElement =>
  "tagName" in node;

const listElements = (node: HtmlNode, tag: string): HtmlElement[] => {
  const found: HtmlElement[] = [];

  if (isElementNode(node) && node.tagName === tag) {
    found.push(node);
  }

  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      found.push(...listElements(child, tag));
    }
  }

  return found;
};

const toAttribute = (element: HtmlElement, name: string): string | null =>
  element.attrs.find((item) => item.name === name)?.value ?? null;

const toNodeText = (element: HtmlElement): string =>
  element.childNodes
    .map((child) => {
      if ("value" in child) {
        return child.value;
      }

      return "";
    })
    .join("");

const toLinkedHref = (element: HtmlElement): string[] => {
  const rel = (toAttribute(element, "rel") ?? "").toLowerCase();
  const href = toAttribute(element, "href") ?? "";

  if (!rel.includes("stylesheet") || href === "" || EXTERNAL_HREF.test(href)) {
    return [];
  }

  return [href.split(/[?#]/u)[0] ?? ""];
};

const toTextInside = async (
  root: string,
  relative: string
): Promise<string | null> => {
  const file = await safeFileInside(root, relative);

  if (file === null) {
    return null;
  }

  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const listLinkedCss = async (
  source: PortLookSource,
  links: readonly HtmlElement[]
): Promise<string[]> => {
  const dir = path.posix.dirname(source.path);

  const files = links.flatMap((link) =>
    toLinkedHref(link).map((href) =>
      path.posix.normalize(path.posix.join(dir, href))
    )
  );

  const texts = await Promise.all(
    files.map((file) => toTextInside(source.workTree, file))
  );

  return texts.filter((text): text is string => text !== null);
};

const toPortLook = async (
  source: PortLookSource,
  app: PortLookApp | null
): Promise<PortLook> => {
  const doc = parse(source.html);

  const [linked, packText] = await Promise.all([
    listLinkedCss(source, listElements(doc, "link")),
    toTextInside(source.workTree, PACK_FILE),
  ]);

  const inline = listElements(doc, "style").map((style) => toNodeText(style));
  const css = [...linked, ...inline].join("\n");
  const defs = toCustomProperties(css, toPackDefs(packText));

  return { app, defs, fonts: toPrototypeFonts(css, source.html, defs) };
};

const toFirstFile = async (
  workTree: string,
  options: readonly string[]
): Promise<string | null> => {
  const found = await Promise.all(
    options.map(async (relative) => {
      const file = await safeFileInside(workTree, relative);

      if (file === null) {
        return null;
      }

      return relative;
    })
  );

  return found.find((item) => item !== null) ?? null;
};

const toLayoutFile = (
  workTree: string,
  appDir: string
): Promise<string | null> =>
  toFirstFile(
    workTree,
    ROUTER_DIRS.flatMap((dir) =>
      LAYOUT_NAMES.map((name) => path.posix.join(appDir, dir, name))
    )
  );

const toTokenFile = async (
  workTree: string,
  appDir: string
): Promise<string | null> => {
  try {
    const token = await findTokenFile(path.join(workTree, appDir));

    if (token === null) {
      return null;
    }

    return path.posix.normalize(path.posix.join(appDir, token));
  } catch {
    return null;
  }
};

const toCssFile = async (
  workTree: string,
  appDir: string,
  layout: AppLayout | null
): Promise<string | null> => {
  const layoutDir = path.posix.dirname(layout?.file ?? "");

  const imported = [...(layout?.text ?? "").matchAll(CSS_IMPORT)].flatMap(
    (match) => {
      const spec = match.groups?.spec ?? "";

      if (!spec.startsWith(".") || !spec.endsWith(".css")) {
        return [];
      }

      return [path.posix.normalize(path.posix.join(layoutDir, spec))];
    }
  );

  const first = await toFirstFile(workTree, imported);

  if (first !== null) {
    return first;
  }

  return toTokenFile(workTree, appDir);
};

const toAppLayout = async (
  workTree: string,
  appDir: string
): Promise<AppLayout | null> => {
  const file = await toLayoutFile(workTree, appDir);

  if (file === null) {
    return null;
  }

  return { file, text: (await toTextInside(workTree, file)) ?? "" };
};

const listAppEntries = async (
  target: PortLookTarget
): Promise<readonly CompiledTokenEntry[]> => {
  try {
    const context = await loadDesignSystemPromptContext(
      target.direction.workTree,
      target.project
    );

    return context?.entries ?? [];
  } catch {
    return [];
  }
};

const toLookApp = async (
  target: PortLookTarget | null
): Promise<PortLookApp | null> => {
  if (target === null) {
    return null;
  }

  const { workTree } = target.direction;
  const appDir = path.posix.normalize(target.project.app?.appDir ?? ".");
  const layout = await toAppLayout(workTree, appDir);

  const [cssFile, entries] = await Promise.all([
    toCssFile(workTree, appDir, layout),
    listAppEntries(target),
  ]);

  let css = "";

  if (cssFile !== null) {
    css = (await toTextInside(workTree, cssFile)) ?? "";
  }

  return {
    cssFile,
    entries,
    fonts: [
      ...toNextFonts(layout?.text ?? "", layout?.file ?? ""),
      ...toCssFonts(css, cssFile ?? ""),
    ],
    isNext: target.project.app?.framework === "next",
    isTailwind: TAILWIND_IMPORT.test(css),
    layoutFile: layout?.file ?? null,
  };
};

const toPortLookPage = async (
  input: PortLookInput,
  page: Omit<PortLookPage, "look">
): Promise<PortLookPage> => {
  const app = await toLookApp(input.target);
  const { workTree } = input.source.direction;

  return { ...page, look: await toPortLook({ ...page, workTree }, app) };
};

const listPortLooks = async (
  input: PortLookInput,
  pages: readonly Omit<PortLookPage, "look">[]
): Promise<PortLookPage[]> => {
  const app = await toLookApp(input.target);
  const { workTree } = input.source.direction;

  return Promise.all(
    pages.map(async (page) => ({
      ...page,
      look: await toPortLook({ ...page, workTree }, app),
    }))
  );
};

export { listPortLooks, toLookApp, toPortLook, toPortLookPage };

export type {
  PortLook,
  PortLookApp,
  PortLookInput,
  PortLookPage,
  PortLookSource,
  PortLookTarget,
};
