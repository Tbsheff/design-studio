interface SpendRecord {
  readonly at: number;
  readonly costUsd: number;
}

const toMonthStart = (now: number): number => {
  const date = new Date(now);

  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
};

const toSpentUsd = (records: readonly SpendRecord[], now: number): number => {
  const start = toMonthStart(now);

  return records
    .filter((record) => record.at >= start)
    .reduce((sum, record) => sum + record.costUsd, 0);
};

const toNextCursor = (
  offset: number,
  limit: number,
  total: number
): string | null => {
  if (offset + limit >= total) {
    return null;
  }

  return String(offset + limit);
};

const toPageOffset = (cursor: string | null): number => {
  const parsed = Number(cursor ?? "0");

  if (!Number.isInteger(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

export { toNextCursor, toPageOffset, toSpentUsd };

export type { SpendRecord };
