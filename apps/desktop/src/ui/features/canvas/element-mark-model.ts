import { ELEMENT_MARK_PARAM } from "@design-studio/contracts";
import type { Direction } from "@design-studio/contracts";

const markOf = (
  directions: readonly Direction[] | undefined,
  directionId: string | null
): string | null => {
  const variation = directions?.find(
    (direction) => direction.id === directionId
  )?.variation;

  if (variation?.scope && !variation.settled) {
    return variation.scope.loc;
  }
  return null;
};

const withElementMark = (
  url: string | null,
  mark: string | null
): string | null => {
  if (!url || !mark) {
    return url;
  }

  const next = new URL(url, globalThis.location.href);
  next.searchParams.set(ELEMENT_MARK_PARAM, mark);

  return next.toString();
};

export { markOf, withElementMark };
