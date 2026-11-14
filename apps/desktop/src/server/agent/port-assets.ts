import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { portPageSlug } from "@design-studio/contracts/port";

import { toAssetScan, toStyleBody } from "./port-asset-scan.js";
import type { AssetPage, AssetSkip, AssetSource } from "./port-asset-scan.js";

interface AssetCopyInput {
  readonly appDir: string;
  readonly pages: readonly AssetPage[];
  readonly route: string;
  readonly sourceWorkTree: string;
  readonly targetWorkTree: string;
}

interface AssetLine {
  readonly reference: string;
  readonly url: string;
}

interface PortAssetCopy {
  readonly copied: number;
  readonly folder: string;
  readonly hasStyle: boolean;
  readonly lines: readonly AssetLine[];
  readonly skipped: readonly AssetSkip[];
  readonly sourceWorkTree: string;
  readonly written: readonly string[];
}

interface AssetTarget {
  readonly folder: string;
  readonly names: Set<string>;
  readonly slug: string;
  readonly sourceWorkTree: string;
  readonly urls: Map<string, string>;
  readonly written: string[];
}

interface PlacedName {
  readonly isNew: boolean;
  readonly name: string;
}

const ASSETS_TAG = "prototype-assets";

const ARROW = " -> ";

const READ_RULE = "Read only these files. Do not search the disk.";

const URL_RULE =
  "Use the new URLs for every asset. Do not copy or move files. The studio copied them.";

const TOKEN_RULE =
  "Map the prototype tokens to the app tokens as the port plan says. The copied tokens.css is a reference; do not link it unless the plan has no token match.";

const toSuffixName = (name: string, index: number): string => {
  if (index === 1) {
    return name;
  }

  const ext = path.posix.extname(name);

  return `${name.slice(0, name.length - ext.length)}-${index}${ext}`;
};

const toExisting = async (file: string): Promise<Buffer | null> => {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
};

const toPlacedName = async (
  target: AssetTarget,
  name: string,
  body: Buffer,
  index: number
): Promise<PlacedName> => {
  const candidate = toSuffixName(name, index);

  if (target.names.has(candidate)) {
    return toPlacedName(target, name, body, index + 1);
  }

  const existing = await toExisting(path.join(target.folder, candidate));

  if (existing !== null && !existing.equals(body)) {
    return toPlacedName(target, name, body, index + 1);
  }

  target.names.add(candidate);

  return { isNew: existing === null, name: candidate };
};

const toSourceBody = async (
  target: AssetTarget,
  source: AssetSource
): Promise<Buffer> => {
  const raw = await readFile(path.join(target.sourceWorkTree, source.file));

  if (!source.isStyle) {
    return raw;
  }

  return Buffer.from(
    toStyleBody(
      raw.toString("utf-8"),
      path.posix.dirname(source.file),
      target.urls
    )
  );
};

const applySourceCopy = async (
  target: AssetTarget,
  source: AssetSource
): Promise<number> => {
  const body = await toSourceBody(target, source);
  const fileName = path.posix.basename(source.file);
  const placed = await toPlacedName(target, fileName, body, 1);

  target.urls.set(source.file, `/${target.slug}/${placed.name}`);

  if (!placed.isNew) {
    return 0;
  }

  const destination = path.join(target.folder, placed.name);

  await mkdir(target.folder, { recursive: true });
  await writeFile(destination, body, { flag: "wx" });
  target.written.push(destination);

  return 1;
};

const applySourceCopies = async (
  target: AssetTarget,
  sources: readonly AssetSource[],
  index: number
): Promise<number> => {
  const source = sources[index] ?? null;

  if (source === null) {
    return 0;
  }

  const copied = await applySourceCopy(target, source);

  return copied + (await applySourceCopies(target, sources, index + 1));
};

const toAssetLines = (
  sources: readonly AssetSource[],
  urls: ReadonlyMap<string, string>
): readonly AssetLine[] => {
  const lines = new Map<string, AssetLine>();

  for (const source of sources) {
    const url = urls.get(source.file) ?? "";

    for (const reference of source.references) {
      lines.set(`${reference}${ARROW}${url}`, { reference, url });
    }
  }

  return [...lines.values()];
};

const toAssetTarget = (input: AssetCopyInput): AssetTarget => {
  const routeSlug = portPageSlug(
    input.route.split("/").findLast((part) => part !== "") ?? ""
  );

  return {
    folder: path.join(input.targetWorkTree, input.appDir, "public", routeSlug),
    names: new Set(),
    slug: routeSlug,
    sourceWorkTree: input.sourceWorkTree,
    urls: new Map(),
    written: [],
  };
};

const deletePortAssets = async (files: readonly string[]): Promise<void> => {
  await Promise.all(files.map((file) => rm(file, { force: true })));
};

const toFolderText = (input: AssetCopyInput, target: AssetTarget): string =>
  `${path.relative(input.targetWorkTree, target.folder).split(path.sep).join("/")}/`;

const applyPortAssets = async (
  input: AssetCopyInput
): Promise<PortAssetCopy> => {
  const scan = await toAssetScan(input.sourceWorkTree, input.pages);
  const target = toAssetTarget(input);

  const sources = scan.sources.toSorted(
    (left, right) => Number(left.isStyle) - Number(right.isStyle)
  );

  let copied = 0;

  try {
    copied = await applySourceCopies(target, sources, 0);
  } catch (error) {
    await deletePortAssets(target.written);

    throw error;
  }

  return {
    copied,
    folder: toFolderText(input, target),
    hasStyle: sources.some((source) => source.isStyle),
    lines: toAssetLines(sources, target.urls),
    skipped: scan.skipped,
    sourceWorkTree: input.sourceWorkTree,
    written: target.written,
  };
};

const toAssetsBody = (copy: PortAssetCopy): string => {
  const lines = [
    `The prototype files are in \`${copy.sourceWorkTree}\`. ${READ_RULE}`,
    ...copy.lines.map((line) => `${line.reference}${ARROW}${line.url}`),
    ...copy.skipped.map(
      (item) => `Skipped: ${item.reference} (${item.reason})`
    ),
  ];

  if (copy.lines.length > 0) {
    lines.push(URL_RULE);
  }

  if (copy.hasStyle) {
    lines.push(TOKEN_RULE);
  }

  return lines.join("\n");
};

const toAssetsTag = (copy: PortAssetCopy): string =>
  [
    `<${ASSETS_TAG} copied="${copy.copied}" skipped="${copy.skipped.length}" folder="${copy.folder}">`,
    toAssetsBody(copy),
    `</${ASSETS_TAG}>`,
  ].join("\n");

const toTagAttribute = (head: string, name: string): string =>
  new RegExp(`${name}="(?<value>[^"]*)"`, "u").exec(head)?.groups?.value ?? "";

const toAssetCountText = (count: number): string => {
  if (count === 1) {
    return "1 prototype asset";
  }

  return `${count} prototype assets`;
};

const toAssetNotes = (prompt: string): readonly string[] => {
  const open = prompt.indexOf(`<${ASSETS_TAG} `);

  if (open === -1) {
    return [];
  }

  const head = prompt.slice(open, prompt.indexOf(">", open));
  const copied = Number(toTagAttribute(head, "copied"));
  const skipped = Number(toTagAttribute(head, "skipped"));
  const notes: string[] = [];

  if (copied > 0) {
    const folder = toTagAttribute(head, "folder");

    notes.push(`Copied ${toAssetCountText(copied)} to ${folder}.`);
  }

  if (skipped > 0) {
    notes.push(
      `Skipped ${toAssetCountText(skipped)}: outside the prototype folder, missing or over 10 MB.`
    );
  }

  return notes;
};

const toAssetMap = (prompt: string): readonly AssetLine[] => {
  const open = prompt.indexOf(`<${ASSETS_TAG} `);
  const close = prompt.indexOf(`</${ASSETS_TAG}>`, open);

  if (open === -1 || close === -1) {
    return [];
  }

  return prompt
    .slice(open, close)
    .split("\n")
    .flatMap((line) => {
      const [reference = "", url = ""] = line.split(ARROW);

      if (!line.includes(ARROW)) {
        return [];
      }

      return [{ reference, url }];
    });
};

export {
  applyPortAssets,
  deletePortAssets,
  toAssetMap,
  toAssetNotes,
  toAssetsTag,
};

export type { AssetCopyInput, AssetLine, PortAssetCopy };
