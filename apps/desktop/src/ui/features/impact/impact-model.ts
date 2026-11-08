import { copy } from "./copy.js";
import type { RouteOutput, impactRoutes } from "./deps.js";

type ImpactView = RouteOutput<typeof impactRoutes.getImpact>;

type ImpactRouteView = ImpactView["routes"][number];

const STATUS_TEXT = {
  changed: copy.changedLabel,
  failed: copy.failedLabel,
  same: copy.sameLabel,
  saved: copy.savedLabel,
} as const;

const toShareText = (route: ImpactRouteView): string => {
  if (route.changedPct === null) {
    return "";
  }

  if (route.changedPct === 0) {
    return copy.noChange;
  }

  return `${route.changedPct}%`;
};

const toStatusText = (route: ImpactRouteView): string =>
  STATUS_TEXT[route.status];

const toTrimmedFile = (file: string): string =>
  file.trim().replace(/^\/+/u, "");

const toCanCompare = (view: ImpactView | null, file: string): boolean => {
  const wanted = toTrimmedFile(file);

  if (
    view === null ||
    !view.hasBaseline ||
    view.file === null ||
    wanted === ""
  ) {
    return false;
  }

  return view.file.endsWith(wanted) || wanted.endsWith(view.file);
};

export { toCanCompare, toShareText, toStatusText };

export type { ImpactRouteView, ImpactView };
