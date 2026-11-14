import path from "node:path";

import type { PortArea, PortMatch } from "@design-studio/actions/port/schema";
import { Effect } from "effect";
import { PNG } from "pngjs";

import { REFERENCE_LOW_SCORE } from "../../../shared/reference.js";
import { attemptKnown } from "../../platform/attempt/index.js";
import { loadConfig } from "../../platform/config/index.js";
import {
  diffPictures,
  pictureSheet,
} from "../../preview/picture-diff/index.js";
import type { PictureRegion } from "../../preview/picture-diff/index.js";
import type { PortCheckQuery, PortReads } from "./port-check-query.js";
import { createPortFiles, toPortFileStem } from "./port-diff-file.js";
import type { ProbeElement } from "./port-mask-probe.js";
import {
  applyPictureMasks,
  readKeptAppTexts,
  toAreaElements,
  toMaskedList,
} from "./port-masks.js";
import type { PairNode } from "./port-pairs-probe.js";
import { toFirstShift, toPairedAreas, toPairs } from "./port-pairs.js";
import type { PortPair } from "./port-pairs.js";
import { toPortShots } from "./port-shots.js";

const ROW_NAMES = ["top", "middle", "bottom"];

const COL_NAMES = ["left", "center", "right"];

const CONTENT_WEIGHT = 0.2;

const FULL_SCORE = 100;

const PORT_CHECK_DIR = "port-check";

const toAreaScore = (region: PictureRegion): number =>
  Math.round(
    CONTENT_WEIGHT * (FULL_SCORE - region.contentDiffersPct) +
      (1 - CONTENT_WEIGHT) * region.edgeMatchPct
  );

const toArea = (region: PictureRegion): PortArea => {
  const [rowName = "", colName = ""] = region.name.split(" ");

  return {
    col: COL_NAMES.indexOf(colName),
    elements: [],
    name: region.name,
    row: ROW_NAMES.indexOf(rowName),
    score: toAreaScore(region),
  };
};

const toLowAreas = (
  regions: readonly PictureRegion[],
  elements: readonly ProbeElement[],
  width: number
): PortArea[] => {
  const areas: PortArea[] = [];

  for (const region of regions) {
    const area = toArea(region);

    if (area.score < REFERENCE_LOW_SCORE) {
      areas.push({
        ...area,
        elements: toAreaElements(elements, area, width),
      });
    }
  }

  return areas;
};

const fromBase64Png = (data: string): PNG =>
  PNG.sync.read(Buffer.from(data, "base64"));

interface PortCheckRead {
  readonly appNodes: readonly PairNode[];
  readonly match: PortMatch;
  readonly pairs: readonly PortPair[];
}

const readPortCheck = Effect.fn("PortMatchStore.readPortCheck")(function* run(
  reads: PortReads,
  query: PortCheckQuery
) {
  const hide = yield* readKeptAppTexts(reads, query);
  const shots = yield* toPortShots(reads, query, hide);
  const prototype = fromBase64Png(shots.prototype.data);
  const app = fromBase64Png(shots.app.data);

  if (query.update !== null) {
    applyPictureMasks([prototype, app], shots, query.width);
  }

  const diff = diffPictures(prototype, app);
  const appNodes = shots.app.probe.nodes;
  const pairs = toPairs(appNodes, shots.prototype.probe.nodes);
  const firstShift = toFirstShift(pairs, appNodes);

  const files = yield* attemptKnown(() =>
    createPortFiles(
      path.join(loadConfig().dataDir, PORT_CHECK_DIR),
      toPortFileStem(
        query.projectId,
        query.targetProjectId,
        query.routePath,
        query.width
      ),
      {
        app: PNG.sync.write(app),
        diff: pictureSheet(prototype, app, diff),
        prototype: PNG.sync.write(prototype),
      }
    )
  );

  const match: PortMatch = {
    ...files,
    areas: toPairedAreas(
      toLowAreas(diff.regions, shots.app.probe.elements, query.width).slice(
        0,
        query.limit
      ),
      pairs,
      query.width,
      firstShift
    ),
    firstShift,
    isLow: diff.score < REFERENCE_LOW_SCORE,
    masked: toMaskedList(shots, query.update !== null),
    score: diff.score,
  };

  const check: PortCheckRead = { appNodes, match, pairs };

  return check;
});

const readPortMatch = Effect.fn("PortMatchStore.readPortMatch")(function* run(
  reads: PortReads,
  query: PortCheckQuery
) {
  const check = yield* readPortCheck(reads, query);

  return check.match;
});

export { readPortCheck, readPortMatch };

export type { PortCheckRead };
