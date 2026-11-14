import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];

type Element = DefaultTreeAdapterMap["element"];

interface AssetPage {
  readonly html: string;
  readonly path: string;
}

interface AssetRef {
  readonly baseDir: string;
  readonly reference: string;
}

interface AssetSkip {
  readonly reason: string;
  readonly reference: string;
}

interface AssetSource {
  readonly file: string;
  readonly isStyle: boolean;
  readonly references: Set<string>;
}

interface AssetScan {
  readonly skipped: readonly AssetSkip[];
  readonly sources: readonly AssetSource[];
}

interface ResolvedRef {
  readonly file: string | null;
  readonly reason: string | null;
  readonly reference: string;
}

const ASSET_MAX_BYTES = 10_485_760;

const REMOTE_REFERENCE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu;

const CSS_URL = /url\((?<quote>["']?)(?<target>[^"')]*)\k<quote>\)/giu;

const STYLE_FILE = /\.css$/iu;

const toAttribute = (element: Element, name: string): string =>
  element.attrs.find((item) => item.name === name)?.value ?? "";

const toChildren = (node: Node): readonly Node[] => {
  if ("content" in node) {
    return node.content.childNodes;
  }

  if ("childNodes" in node) {
    return node.childNodes;
  }

  return [];
};

const toElements = (node: Node): readonly Element[] => {
  const out: Element[] = [];
  const stack: Node[] = [node];

  while (stack.length > 0) {
    const current = stack.pop() ?? node;

    if ("tagName" in current) {
      out.push(current);
    }

    stack.push(...toChildren(current));
  }

  return out;
};

const toCssReferences = (css: string): readonly string[] =>
  [...css.matchAll(CSS_URL)].map((match) =>
    (match.groups?.target ?? "").trim()
  );

const toSrcsetReferences = (srcset: string): readonly string[] =>
  srcset.split(",").flatMap((part) => part.trim().split(/\s+/u).slice(0, 1));

const toStyleText = (element: Element): string =>
  toChildren(element)
    .map((child) => {
      if ("value" in child) {
        return child.value;
      }

      return "";
    })
    .join("");

const isStylesheet = (element: Element): boolean =>
  element.tagName === "link" &&
  toAttribute(element, "rel")
    .toLowerCase()
    .split(/\s+/u)
    .includes("stylesheet");

const toTagReferences = (element: Element): readonly string[] => {
  if (element.tagName === "img" || element.tagName === "source") {
    return [
      toAttribute(element, "src"),
      ...toSrcsetReferences(toAttribute(element, "srcset")),
    ];
  }

  if (element.tagName === "video") {
    return [toAttribute(element, "poster")];
  }

  if (element.tagName === "style") {
    return toCssReferences(toStyleText(element));
  }

  if (isStylesheet(element)) {
    return [toAttribute(element, "href")];
  }

  return [];
};

const toElementReferences = (element: Element): readonly string[] =>
  [
    ...toCssReferences(toAttribute(element, "style")),
    ...toTagReferences(element),
  ].flatMap((item) => {
    const trimmed = item.trim();

    if (trimmed === "" || REMOTE_REFERENCE.test(trimmed)) {
      return [];
    }

    return [trimmed];
  });

const toPageRefs = (page: AssetPage): readonly AssetRef[] => {
  const baseDir = path.posix.dirname(page.path);

  const references = new Set(
    toElements(parse(page.html)).flatMap((element) =>
      toElementReferences(element)
    )
  );

  return [...references].map((reference) => ({ baseDir, reference }));
};

const toDecoded = (reference: string): string => {
  try {
    return decodeURI(reference);
  } catch {
    return reference;
  }
};

const toResolvedFile = (ref: AssetRef): string | null => {
  const clean = toDecoded(ref.reference.split(/[?#]/u)[0] ?? "");
  let joined = path.posix.join(ref.baseDir, clean);

  if (clean.startsWith("/")) {
    joined = clean.slice(1);
  }

  const normal = path.posix.normalize(joined);

  if (normal === ".." || normal.startsWith("../") || normal === ".") {
    return null;
  }

  return normal;
};

const toFileSize = async (file: string): Promise<number | null> => {
  try {
    const info = await stat(file);

    if (!info.isFile()) {
      return null;
    }

    return info.size;
  } catch {
    return null;
  }
};

const toSkipReason = async (
  workTree: string,
  file: string | null
): Promise<string | null> => {
  if (file === null) {
    return "outside the prototype folder";
  }

  const size = await toFileSize(path.join(workTree, file));

  if (size === null) {
    return "not found in the prototype folder";
  }

  if (size > ASSET_MAX_BYTES) {
    return "over 10 MB";
  }

  return null;
};

const toResolvedRef = async (
  workTree: string,
  ref: AssetRef
): Promise<ResolvedRef> => {
  const file = toResolvedFile(ref);
  const skipReason = await toSkipReason(workTree, file);

  if (skipReason !== null) {
    return { file: null, reason: skipReason, reference: ref.reference };
  }

  return { file: file ?? "", reason: null, reference: ref.reference };
};

const toStyleRefs = async (
  workTree: string,
  file: string
): Promise<readonly AssetRef[]> => {
  const css = await readFile(path.join(workTree, file), "utf-8");
  const baseDir = path.posix.dirname(file);

  return toCssReferences(css).flatMap((reference) => {
    if (reference === "" || REMOTE_REFERENCE.test(reference)) {
      return [];
    }

    return [{ baseDir, reference }];
  });
};

const toResolvedRefs = (
  workTree: string,
  refs: readonly AssetRef[]
): Promise<readonly ResolvedRef[]> =>
  Promise.all(refs.map((ref) => toResolvedRef(workTree, ref)));

const toFoldedScan = (resolved: readonly ResolvedRef[]): AssetScan => {
  const skipped = new Map<string, AssetSkip>();
  const sources = new Map<string, AssetSource>();

  for (const item of resolved) {
    if (item.file === null) {
      skipped.set(item.reference, {
        reason: item.reason ?? "",
        reference: item.reference,
      });
    } else {
      const source = sources.get(item.file) ?? {
        file: item.file,
        isStyle: STYLE_FILE.test(item.file),
        references: new Set<string>(),
      };

      source.references.add(item.reference);
      sources.set(item.file, source);
    }
  }

  return { skipped: [...skipped.values()], sources: [...sources.values()] };
};

const toAssetScan = async (
  workTree: string,
  pages: readonly AssetPage[]
): Promise<AssetScan> => {
  const pageRefs = await toResolvedRefs(
    workTree,
    pages.flatMap((page) => toPageRefs(page))
  );

  const styleFiles = [
    ...new Set(
      pageRefs.flatMap((item) => {
        if (item.file === null || !STYLE_FILE.test(item.file)) {
          return [];
        }

        return [item.file];
      })
    ),
  ];

  const styleRefs = await Promise.all(
    styleFiles.map((file) => toStyleRefs(workTree, file))
  );

  return toFoldedScan([
    ...pageRefs,
    ...(await toResolvedRefs(workTree, styleRefs.flat())),
  ]);
};

const toStyleBody = (
  css: string,
  baseDir: string,
  urls: ReadonlyMap<string, string>
): string =>
  css.replaceAll(CSS_URL, (whole: string, quote: string, raw: string) => {
    const file = toResolvedFile({ baseDir, reference: raw.trim() });
    const url = urls.get(file ?? "") ?? null;

    if (url === null) {
      return whole;
    }

    return `url(${quote}${url}${quote})`;
  });

export { toAssetScan, toStyleBody };

export type { AssetPage, AssetScan, AssetSkip, AssetSource };
