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
    name: region.name,
    row: ROW_NAMES.indexOf(rowName),
    score: toAreaScore(region),
  };
};

const toLowAreas = (regions: readonly PictureRegion[]): PortArea[] => {
  const areas: PortArea[] = [];

  for (const region of regions) {
    const area = toArea(region);

    if (area.score < REFERENCE_LOW_SCORE) {
      areas.push(area);
    }
  }

  return areas;
};

const fromBase64Png = (data: string): PNG =>
  PNG.sync.read(Buffer.from(data, "base64"));

const readPortMatch = Effect.fn("PortMatchStore.readPortMatch")(function* run(
  reads: PortReads,
  query: PortCheckQuery
) {
  const shots = yield* toPortShots(reads, query);
  const prototype = fromBase64Png(shots.prototype);
  const app = fromBase64Png(shots.app);
  const diff = diffPictures(prototype, app);

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
    areas: toLowAreas(diff.regions),
    isLow: diff.score < REFERENCE_LOW_SCORE,
    score: diff.score,
  };

  return match;
});

export { readPortMatch };
