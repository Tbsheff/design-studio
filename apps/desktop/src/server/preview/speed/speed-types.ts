import type {
  SpeedKeySchema,
  SpeedResultSchema,
} from "@design-studio/actions/speed/schema";

import type { SpeedResources, SpeedVitals } from "./speed-page.probe.js";

type SpeedResult = typeof SpeedResultSchema.Type;

type SpeedKey = typeof SpeedKeySchema.Type;

type SpeedProbe = SpeedResources & SpeedVitals;

type SpeedValues = Readonly<Record<SpeedKey, number | null>>;

interface SpeedGetQuery {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

interface SpeedRunQuery extends SpeedGetQuery {
  readonly phase: "baseline" | "compare";
  readonly runs: number;
}

interface SpeedImage {
  readonly bytes: number;
  readonly url: string;
}

interface SpeedSample {
  readonly images: readonly SpeedImage[];
  readonly isDevBuild: boolean;
  readonly route: string | null;
  readonly runs: number;
  readonly values: SpeedValues;
}

interface SpeedRecord {
  readonly baseline: SpeedSample | null;
  readonly last: SpeedResult;
}

export type {
  SpeedGetQuery,
  SpeedImage,
  SpeedKey,
  SpeedProbe,
  SpeedRecord,
  SpeedResult,
  SpeedRunQuery,
  SpeedSample,
  SpeedValues,
};
