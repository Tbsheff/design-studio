import { readFile } from "node:fs/promises";
import path from "node:path";

import { ASSETS_FILE } from "./deps.js";
import type { ImageSearchHit } from "./deps.js";

interface CreditEdit {
  readonly code: string;
  readonly exists: boolean;
  readonly file: string;
  readonly line: string;
  readonly original: string;
  readonly relative: string;
}

const HEADER = `# Assets\n\nCredits for the photos in this project. Keep each line when you ship the design.\n\n`;

const UNSAFE = /[\r\n|[\]]+/gu;

const toClean = (value: string): string => value.replaceAll(UNSAFE, " ").trim();

const toLinked = (label: string, url: string | null): string => {
  if (url === null) {
    return label;
  }

  return `[${label}](${url})`;
};

const toFileLabel = (asset: string | null): string => {
  if (asset === null) {
    return "";
  }

  return `\`${asset}\`: `;
};

const toCreditLine = (hit: ImageSearchHit, asset: string | null): string => {
  const title = toLinked(toClean(hit.title ?? "Untitled"), hit.sourceUrl);

  const author = toLinked(
    toClean(hit.author ?? "unknown author"),
    hit.authorUrl
  );

  const license = toLinked(hit.license, hit.licenseUrl);
  const via = toClean(hit.provider ?? "Openverse");

  return `- ${toFileLabel(asset)}${title} by ${author}, ${license}, via ${via} (openverse ${hit.id})`;
};

const toReadCredits = async (file: string): Promise<string | null> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
};

const toAppended = (original: string, line: string): string => {
  if (original === "") {
    return `${HEADER}${line}\n`;
  }

  if (original.endsWith("\n")) {
    return `${original}${line}\n`;
  }

  return `${original}\n${line}\n`;
};

const toPlanCredit = async (
  workTree: string,
  hit: ImageSearchHit,
  asset: string | null
): Promise<CreditEdit> => {
  const file = path.join(workTree, ASSETS_FILE);
  const read = await toReadCredits(file);
  const original = read ?? "";
  const line = toCreditLine(hit, asset);
  const isKnown = original.includes(`(openverse ${hit.id})`);
  const exists = read !== null;
  const relative = ASSETS_FILE;
  let code = toAppended(original, line);

  if (isKnown) {
    code = original;
  }

  return {
    code,
    exists,
    file,
    line,
    original,
    relative,
  };
};

export { toCreditLine as creditLine, toPlanCredit as planCredit };

export type { CreditEdit };
