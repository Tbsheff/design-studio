import { ICON_LIST_MAX } from "./deps.js";
import type { IconList, IconSource, IconSummary } from "./deps.js";
import { appRoot, iconSetFor } from "./library.js";
import type { IconScope } from "./library.js";
import { nameKey } from "./set.js";
import type { IconSet } from "./set.js";
import { svgMarkup } from "./svg.js";

interface ListIconsRequest {
  readonly library: IconSource | null;
  readonly limit: number;
  readonly query: string;
}

interface Ranked {
  at: number;
  name: string;
}

const PREVIEW_SIZE = 24;
const RANK_EXACT = 0;
const RANK_PREFIX = 1;
const RANK_WORD = 2;
const RANK_PART = 3;
const NO_RANK = -1;

const rank = (name: string, query: string): number => {
  if (name === query) {
    return RANK_EXACT;
  }

  if (name.startsWith(query)) {
    return RANK_PREFIX;
  }

  if (name.split("-").includes(query)) {
    return RANK_WORD;
  }

  if (name.includes(query)) {
    return RANK_PART;
  }

  return NO_RANK;
};

const byRank = (left: Ranked, right: Ranked): number =>
  left.at - right.at ||
  left.name.length - right.name.length ||
  left.name.localeCompare(right.name);

const matchNames = (names: readonly string[], raw: string): string[] => {
  const query = nameKey(raw);

  if (!query) {
    return names.toSorted((left, right) => left.localeCompare(right));
  }

  return names
    .flatMap((name) => {
      const at = rank(name, query);

      if (at === NO_RANK) {
        return [];
      }

      return [{ at, name }];
    })
    .toSorted(byRank)
    .map((item) => item.name);
};

const summary = async (set: IconSet, icon: string): Promise<IconSummary> => {
  const [nodes, componentName] = await Promise.all([
    set.nodes(icon),
    set.component(icon),
  ]);

  return {
    component: componentName,
    library: set.source,
    name: icon,
    svg: svgMarkup(
      nodes ?? [],
      set.frame,
      { color: null, name: icon, size: PREVIEW_SIZE },
      false
    ),
  };
};

const listIcons = async (
  scope: IconScope,
  request: ListIconsRequest
): Promise<IconList> => {
  const set = await iconSetFor(scope, appRoot(scope), request.library);
  const limit = Math.min(request.limit, ICON_LIST_MAX);
  const names = matchNames(await set.names(), request.query);

  const icons = await Promise.all(
    names.slice(0, limit).map((name) => summary(set, name))
  );

  return {
    icons,
    importFrom: set.importFrom,
    library: set.source,
    total: names.length,
  };
};

export { listIcons, matchNames };

export type { ListIconsRequest };
