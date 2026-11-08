import type { ImpactGetQuery, ImpactRecord } from "./impact-types.js";

const records = new Map<string, ImpactRecord>();

const toImpactKey = (query: ImpactGetQuery): string =>
  `${query.projectId}|${query.directionId ?? "main"}`;

const getImpactRecord = (query: ImpactGetQuery): ImpactRecord | null =>
  records.get(toImpactKey(query)) ?? null;

const setImpactRecord = (query: ImpactGetQuery, record: ImpactRecord): void => {
  records.set(toImpactKey(query), record);
};

export { getImpactRecord, setImpactRecord };
