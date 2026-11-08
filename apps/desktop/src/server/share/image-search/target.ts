import { readFile } from "node:fs/promises";
import path from "node:path";

import { imageKindOf } from "./deps.js";
import type { SetImageRequest, SourceLoc } from "./deps.js";

type PlaceTarget = SetImageRequest["target"];

const HTML_MAX = 4000;

const TAG = /^<(?<tag>[A-Za-z][\w.]*)/u;

interface ElementView {
  readonly outerHTML: string;
  readonly source?: SourceLoc | null | undefined;
  readonly styles: Record<string, string>;
  readonly tag: string;
}

interface TargetDraft {
  background: boolean;
  html?: string;
  owners?: { name: string; stack: string }[];
  selector: string;
  source: SourceLoc | null;
  tag: string;
}

interface OwnerView {
  readonly owners: readonly { name: string; stack: string }[];
}

const toReadSource = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const toTagAtSource = async (
  workTree: string,
  source: SourceLoc
): Promise<string> => {
  const content = await toReadSource(path.join(workTree, source.file));
  const line = content.split("\n")[source.line - 1] ?? "";
  const tag = TAG.exec(line.slice(source.col - 1))?.groups?.tag;

  if (tag === "img" || tag === "Image") {
    return "img";
  }

  return tag ?? "element";
};

const toSourceTarget = async (
  workTree: string,
  source: SourceLoc
): Promise<PlaceTarget> => ({
  source,
  tag: await toTagAtSource(workTree, source),
});

const toElementTarget = (
  element: ElementView,
  selector: string,
  probed: OwnerView | null
): PlaceTarget => {
  const owners = probed?.owners ?? [];

  const background = imageKindOf(element) === "background";
  const source = element.source ?? null;
  const { tag } = element;

  const target: TargetDraft = { background, selector, source, tag };

  if (!element.source) {
    target.html = element.outerHTML.slice(0, HTML_MAX);
  }

  if (owners.length > 0) {
    target.owners = [...owners];
  }

  return target;
};

export {
  toElementTarget as elementTarget,
  toSourceTarget as sourceTarget,
  toTagAtSource as tagAtSource,
};

export type { ElementView, OwnerView, PlaceTarget };
