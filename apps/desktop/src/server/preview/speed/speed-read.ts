import { setTimeout as delay } from "node:timers/promises";

import { withFrameStateHost } from "@design-studio/contracts/frame-state";
import { withForcedParam } from "@design-studio/contracts/state-styles";

import type { RenderPage } from "../../../shared/server-ports.js";
import { BadRequestError } from "../../platform/errors/index.js";
import { withPagePath } from "../../project-source/index.js";
import { attemptNull, toOptional } from "../attempt-null.js";
import { pickFrame } from "../frame-shot-pick.js";
import { NO_RENDER, resolveFrameSource } from "../frame-source.js";
import type { ShotQuery } from "../frame-source.js";
import type { McpReadRuntime } from "../mcp-read-core.js";
import { hideDevChrome, waitForPage } from "../page-capture/index.js";
import { warmAppPage } from "../warm-upstream.js";
import {
  toResourcesExpression,
  toVitalsExpression,
  toWatchExpression,
} from "./speed-expression.js";
import { toSample } from "./speed-numbers.js";
import type { SpeedResources, SpeedVitals } from "./speed-page.probe.js";
import type { SpeedProbe, SpeedRunQuery, SpeedSample } from "./speed-types.js";

const DEFAULT_WIDTH = 1440;

const DEFAULT_HEIGHT = 900;

const SETTLE_MS = 400;

const toShotQuery = (query: SpeedRunQuery): ShotQuery => ({
  colorScheme: null,
  directionId: query.directionId,
  element: null,
  frameId: query.frameId,
  height: null,
  isFullPage: false,
  padding: null,
  path: null,
  projectId: query.projectId,
  versionId: null,
  width: null,
});

const toMeasure =
  (url: string) =>
  async (page: RenderPage): Promise<SpeedProbe> => {
    await page.setColdLoad?.(true);

    try {
      await page.goto(url);
      await waitForPage(page);
      await hideDevChrome(page);
      await page.evaluate<boolean>(toWatchExpression());
      await delay(SETTLE_MS);
    } finally {
      await page.setColdLoad?.(false);
    }

    const [vitals, resources] = await Promise.all([
      page.evaluate<SpeedVitals>(toVitalsExpression()),
      page.evaluate<SpeedResources>(toResourcesExpression()),
    ]);

    return { ...resources, ...vitals };
  };

const toProbes = async (
  measure: () => Promise<SpeedProbe>,
  remaining: number,
  done: readonly SpeedProbe[]
): Promise<readonly SpeedProbe[]> => {
  if (remaining === 0) {
    return done;
  }

  const next = await measure();

  return toProbes(measure, remaining - 1, [...done, next]);
};

const getSpeedSample = async (
  runtime: McpReadRuntime,
  query: SpeedRunQuery
): Promise<SpeedSample> => {
  const { preview } = runtime;

  if (!preview?.withPage) {
    throw new BadRequestError(NO_RENDER);
  }

  const { withPage } = preview;
  const pick = await pickFrame(runtime.projects, toShotQuery(query));

  const src = await resolveFrameSource(
    runtime,
    {
      directionId: pick.directionId,
      projectId: query.projectId,
      versionId: pick.versionId,
    },
    true
  );

  await warmAppPage(preview, src.project, pick.path);
  const opened = await src.open();

  try {
    const base = withForcedParam(
      withFrameStateHost(opened.url, toOptional(pick.state)),
      pick.forced
    );

    const url = withPagePath(base, toOptional(pick.path));

    const size = {
      height: pick.height ?? DEFAULT_HEIGHT,
      width: pick.width ?? DEFAULT_WIDTH,
    };

    const probes = await toProbes(
      () => withPage(url, size, toMeasure(url)),
      query.runs,
      []
    );

    return toSample(probes, pick.path, Boolean(src.project.app));
  } finally {
    await attemptNull(() => opened.release());
  }
};

export { getSpeedSample };
