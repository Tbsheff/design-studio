import type { SpeedGetQuery, SpeedRecord } from "./speed-types.js";

const records = new Map<string, SpeedRecord>();

const toSpeedKey = (query: SpeedGetQuery): string =>
  `${query.projectId}|${query.directionId ?? "main"}|${query.frameId}`;

const getSpeedRecord = (query: SpeedGetQuery): SpeedRecord | null =>
  records.get(toSpeedKey(query)) ?? null;

const setSpeedRecord = (query: SpeedGetQuery, record: SpeedRecord): void => {
  records.set(toSpeedKey(query), record);
};

export { getSpeedRecord, setSpeedRecord };
