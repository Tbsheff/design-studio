import type { PageSourceChanges } from "@design-studio/actions/page/source/schema";
import {
  PORT_AREA_ELEMENTS_MAX,
  PORT_MASKED_MAX,
} from "@design-studio/actions/port/schema";
import type {
  PortArea,
  PortElement,
  PortMasked,
} from "@design-studio/actions/port/schema";
import { Effect } from "effect";
import type { PNG } from "pngjs";

import type { ProbeRect } from "../../../shared/server-ports.js";
import { maskRect } from "../../preview/picture-diff/index.js";
import type {
  PortCheckQuery,
  PortReads,
  PortRouteUpdate,
  PortShotPair,
} from "./port-check-query.js";
import type { ProbeElement } from "./port-mask-probe.js";
import { SHOT_HEIGHT, toUrlRoute } from "./port-shots.js";

interface PortUpdateTarget {
  readonly directionId: string | null;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

interface PortSourceCommand {
  readonly directionId: string;
  readonly file: string;
  readonly projectId: string;
}

const MASK_MARGIN = 24;

const TEXT_MAX = 60;

const KEPT_TEXT_MAX = 10;

const GRID = 3;

const JSX_TEXT = />(?<text>[^<>{}]+)</gu;

const HAS_LETTER = /\p{L}/u;

const SPACE = /\s+/gu;

const ELEMENT_RANK = [
  "h1",
  "h2",
  "h3",
  "table",
  "button",
  "input",
  "img",
  "p",
  "a",
  "form",
  "nav",
  "header",
];

const toNormal = (text: string): string => text.replaceAll(SPACE, " ").trim();

const toLineTexts = (line: string): string[] => {
  const body = line.slice(1);

  const texts = [...body.matchAll(JSX_TEXT)].map((found) =>
    toNormal(found.groups?.["text"] ?? "")
  );

  if (!/[<>{}]/u.test(body)) {
    texts.push(toNormal(body));
  }

  return texts.filter((text) => HAS_LETTER.test(text));
};

const toDiffTexts = (diff: string, marks: string): string[] =>
  diff
    .split("\n")
    .filter((line) => marks.includes(line.charAt(0)) && !line.startsWith("+++"))
    .flatMap((line) => toLineTexts(line));

const toPageText = (html: string): string =>
  toNormal(
    html
      .split("<")
      .map((part) => part.slice(part.indexOf(">") + 1))
      .join(" ")
  );

const isInText = (whole: string, part: string): boolean => whole.includes(part);

const toKeptAppTexts = (
  diffs: readonly string[],
  prototypeHtml: string
): string[] => {
  const page = toPageText(prototypeHtml);
  const before = new Set(diffs.flatMap((diff) => toDiffTexts(diff, "- ")));
  const added = diffs.flatMap((diff) => toDiffTexts(diff, "+"));

  return [...new Set(added)]
    .filter((text) => !before.has(text) && !isInText(page, text))
    .slice(0, KEPT_TEXT_MAX);
};

const readKeptAppTexts = Effect.fn("PortMatchStore.readKeptAppTexts")(
  function* run(reads: PortReads, query: PortCheckQuery) {
    if (query.update === null) {
      return [];
    }

    const page = yield* reads
      .fileText({
        directionId: query.directionId,
        path: query.path,
        projectId: query.projectId,
        versionId: null,
      })
      .pipe(Effect.orElseSucceed(() => ({ text: "" })));

    return toKeptAppTexts(query.update.diffs, page.text);
  }
);

const toInsetRect = (rect: ProbeRect, scale: number): ProbeRect => ({
  height: rect.height * scale - 2 * MASK_MARGIN,
  width: rect.width * scale - 2 * MASK_MARGIN,
  x: rect.x * scale + MASK_MARGIN,
  y: rect.y * scale + MASK_MARGIN,
});

const applyPictureMasks = (
  pictures: readonly PNG[],
  pair: PortShotPair,
  width: number
): void => {
  const cells = [...pair.app.probe.cells, ...pair.prototype.probe.cells];

  for (const picture of pictures) {
    const scale = picture.width / width;

    for (const cell of cells) {
      maskRect(
        picture.data,
        picture.width,
        picture.height,
        toInsetRect(cell, scale)
      );
    }
  }
};

const toCut = (text: string): string => text.slice(0, TEXT_MAX);

const toRowsText = (count: number, page: string): string => {
  if (count === 1) {
    return `Hid 1 extra data row on the ${page} page.`;
  }

  return `Hid ${count} extra data rows on the ${page} page.`;
};

const toMaskedList = (pair: PortShotPair, isUpdate: boolean): PortMasked[] => {
  if (!isUpdate) {
    return [];
  }

  const masked: PortMasked[] = [...new Set(pair.app.probe.hidden)].map(
    (text) => ({ reason: "app-change", text: toCut(text) })
  );

  for (const [shot, page] of [
    [pair.app, "app"],
    [pair.prototype, "prototype"],
  ] as const) {
    if (shot.probe.hiddenRows > 0) {
      masked.push({
        reason: "data-row",
        text: toRowsText(shot.probe.hiddenRows, page),
      });
    }
  }

  for (const text of pair.app.probe.cellTexts) {
    masked.push({ reason: "data-row", text: toCut(text) });
  }

  return masked.slice(0, PORT_MASKED_MAX);
};

const toRank = (element: ProbeElement): number => {
  const tag = /^[a-z0-9]+/u.exec(element.selector.split(" > ").at(-1) ?? "");
  const rank = ELEMENT_RANK.indexOf(tag?.[0] ?? "");

  if (rank === -1) {
    return ELEMENT_RANK.length;
  }

  return rank;
};

const isInArea = (
  element: ProbeElement,
  area: PortArea,
  width: number
): boolean => {
  const col = Math.floor(((element.x + element.width / 2) * GRID) / width);

  const row = Math.floor(
    ((element.y + element.height / 2) * GRID) / SHOT_HEIGHT
  );

  return col === area.col && row === area.row;
};

const toAreaElements = (
  elements: readonly ProbeElement[],
  area: PortArea,
  width: number
): PortElement[] =>
  elements
    .filter((element) => isInArea(element, area, width))
    .toSorted((first, second) => toRank(first) - toRank(second))
    .slice(0, PORT_AREA_ELEMENTS_MAX)
    .map((element) => ({
      diffs: [],
      selector: element.selector,
      text: element.text,
    }));

const MAIN_DIRECTION = "main";

const toPortSourceCommand = (target: PortUpdateTarget): PortSourceCommand => ({
  directionId: target.directionId ?? MAIN_DIRECTION,
  file: target.path,
  projectId: target.projectId,
});

const isSameApp = (
  changes: PageSourceChanges,
  target: PortUpdateTarget
): boolean =>
  changes.isRouteCopy &&
  changes.appProjectId === target.targetProjectId &&
  toUrlRoute(changes.routePath ?? "") === toUrlRoute(target.routePath);

const toPortRouteUpdate = (
  changes: PageSourceChanges | null,
  target: PortUpdateTarget
): PortRouteUpdate | null => {
  if (changes === null || !isSameApp(changes, target)) {
    return null;
  }

  return { diffs: changes.files.map((file) => file.diff) };
};

export {
  applyPictureMasks,
  isInArea,
  readKeptAppTexts,
  toAreaElements,
  toKeptAppTexts,
  toMaskedList,
  toPortRouteUpdate,
  toPortSourceCommand,
  toRank,
};
