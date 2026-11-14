import type { PageFlowGap } from "@design-studio/actions/page/flow/schema";
import { PAGE_FLOW_GAP_MAX } from "@design-studio/actions/page/flow/schema";

import {
  toAllElements,
  toDocument,
  toElementSpot,
} from "../../page-match/engine/to-element-spot.js";
import type { HtmlElement } from "../../page-match/engine/to-element-spot.js";
import {
  toPageHit,
  toPageSource,
} from "../../page-match/engine/to-page-matches.js";
import { toFlowPath } from "./to-flow-links.js";
import { toChangedCount, toFlowParts } from "./to-flow-parts.js";
import type { FlowPart } from "./to-flow-parts.js";
import { toRootTokens, toSheetLinks } from "./to-flow-styles.js";

interface FlowPage {
  readonly file: string;
  readonly html: string;
}

interface ParsedPage {
  readonly all: readonly HtmlElement[];
  readonly file: string;
  readonly html: string;
}

const toParsed = (page: FlowPage): ParsedPage => ({
  all: toAllElements(toDocument(page.html)),
  file: page.file,
  html: page.html,
});

const toChangedDetail = (count: number): string => {
  if (count === 0) {
    return "its markup changed";
  }

  if (count === 1) {
    return "1 item changed";
  }

  return `${count} items changed`;
};

const toPartGap = (
  entry: ParsedPage,
  page: ParsedPage,
  part: FlowPart
): PageFlowGap | null => {
  const source = toPageSource(entry.html, part.selector);

  if (source === null) {
    return null;
  }

  const hit = toPageHit(source, page.html);

  if (hit === null) {
    return {
      detail: `The ${part.name} of ${entry.file} is missing on ${page.file}.`,
      kind: "part-missing",
      page: page.file,
      part: part.name,
      selector: part.selector,
    };
  }

  if (hit.isSame) {
    return null;
  }

  const spot = toElementSpot(page.html, hit.selector);
  let count = 0;

  if (spot !== null) {
    count = toChangedCount(part.element, spot.element);
  }

  return {
    detail: `The ${part.name} on ${page.file} differs from ${entry.file} (${toChangedDetail(count)}).`,
    kind: "part-changed",
    page: page.file,
    part: part.name,
    selector: part.selector,
  };
};

const listTokenGaps = (entry: ParsedPage, page: ParsedPage): PageFlowGap[] => {
  const own = toRootTokens(entry.all);
  const other = toRootTokens(page.all);
  const gaps: PageFlowGap[] = [];

  for (const [name, value] of own) {
    const theirs = other.get(name) ?? null;

    if (theirs !== null && theirs !== value) {
      gaps.push({
        detail: `${name} is ${theirs} on ${page.file} and ${value} on ${entry.file}.`,
        kind: "token-changed",
        page: page.file,
        part: name,
        selector: null,
      });
    }
  }

  return gaps;
};

const toSheetKeys = (page: ParsedPage): ReadonlyMap<string, string> =>
  new Map(
    toSheetLinks(page.all).map((href) => [
      toFlowPath(href, page.file) ?? href,
      href,
    ])
  );

const listSheetGaps = (entry: ParsedPage, page: ParsedPage): PageFlowGap[] => {
  const theirs = toSheetKeys(page);
  const gaps: PageFlowGap[] = [];

  for (const [key, href] of toSheetKeys(entry)) {
    if (!theirs.has(key)) {
      gaps.push({
        detail: `${page.file} does not link ${href}, which ${entry.file} links.`,
        kind: "sheet-missing",
        page: page.file,
        part: href,
        selector: null,
      });
    }
  }

  return gaps;
};

const listPageGaps = (
  entry: ParsedPage,
  parts: readonly FlowPart[],
  page: ParsedPage
): PageFlowGap[] => {
  const partGaps = parts.flatMap((part) => {
    const gap = toPartGap(entry, page, part);

    if (gap === null) {
      return [];
    }

    return [gap];
  });

  return [
    ...partGaps,
    ...listTokenGaps(entry, page),
    ...listSheetGaps(entry, page),
  ];
};

const toFlowGaps = (pages: readonly FlowPage[]): readonly PageFlowGap[] => {
  const first = pages.at(0) ?? null;
  const rest = pages.slice(1);

  if (first === null || rest.length === 0) {
    return [];
  }

  const entry = toParsed(first);
  const parts = toFlowParts(entry.all);

  return rest
    .flatMap((page) => listPageGaps(entry, parts, toParsed(page)))
    .slice(0, PAGE_FLOW_GAP_MAX);
};

export { toFlowGaps };

export type { FlowPage };
