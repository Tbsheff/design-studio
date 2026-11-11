const MAX_DRAFTS = 4;

const toDraftCounts = (): readonly number[] =>
  Array.from({ length: MAX_DRAFTS }, (_unused, index) => index + 1);

const DRAFT_COUNTS = toDraftCounts();

const toDraftsLabel = (count: number): string => {
  if (count === 1) {
    return "1 draft";
  }

  return `${count} drafts`;
};

const toDraftsShort = (count: number): string => `${count}×`;

const toDraftHint = (count: number): string => {
  if (count === 1) {
    return "One design";
  }

  return `${count} designs side by side`;
};

const isDraftOff = (
  count: number,
  max: number,
  blocker: string | null
): boolean => count > max || (count > 1 && blocker !== null);

export { DRAFT_COUNTS, isDraftOff, toDraftHint, toDraftsLabel, toDraftsShort };
