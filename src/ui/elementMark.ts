import { ELEMENT_MARK_PARAM, type Direction } from '../shared/contracts';

export function markOf(directions: readonly Direction[] | undefined, directionId: string | null): string | null {
  const variation = directions?.find((d) => d.id === directionId)?.variation;
  return variation?.scope && !variation.settled ? variation.scope.loc : null;
}

export function withElementMark(url: string | null, mark: string | null): string | null {
  if (!url || !mark) return url;
  const next = new URL(url, window.location.href);
  next.searchParams.set(ELEMENT_MARK_PARAM, mark);
  return next.toString();
}
