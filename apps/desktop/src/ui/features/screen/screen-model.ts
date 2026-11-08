import { copy } from "./copy.js";
import type { RouteOutput, screenRoutes } from "./deps.js";

type ScreenPlanWire = RouteOutput<typeof screenRoutes.inspectScreen>;

type PlanGroup = ScreenPlanWire["groups"]["items"][number];

type ScreenLayoutId = "blank" | "detail" | "form" | "list";

interface LayoutOption {
  readonly id: ScreenLayoutId;
  readonly label: string;
  readonly note: string;
}

const LAYOUT_OPTIONS: readonly LayoutOption[] = [
  { id: "blank", label: copy.layoutBlank, note: copy.layoutBlankNote },
  { id: "list", label: copy.layoutList, note: copy.layoutListNote },
  { id: "detail", label: copy.layoutDetail, note: copy.layoutDetailNote },
  { id: "form", label: copy.layoutForm, note: copy.layoutFormNote },
];

const COPY_SUFFIX = "-copy";

const HTML_EXTENSION = ".html";

const toTrimmedPath = (path: string): string => path.trim();

const hasPath = (path: string): boolean => toTrimmedPath(path) !== "";

const toCopyHtmlPath = (path: string): string => {
  const stem = path.slice(0, -HTML_EXTENSION.length);

  return `${stem}${COPY_SUFFIX}${HTML_EXTENSION}`;
};

const toCopyPath = (path: string): string => {
  const trimmed = toTrimmedPath(path);

  if (trimmed.endsWith(HTML_EXTENSION)) {
    return toCopyHtmlPath(trimmed);
  }

  const segments = trimmed.split("/").filter((part) => part !== "");
  const at = segments.findLastIndex((part) => !part.startsWith("["));

  if (at === -1) {
    return `/${[...segments, "copy"].join("/")}`;
  }

  const renamed = segments.map((part, index) => {
    if (index === at) {
      return `${part}${COPY_SUFFIX}`;
    }

    return part;
  });

  return `/${renamed.join("/")}`;
};

const toPickedGroup = (plan: ScreenPlanWire | null): string | null => {
  if (plan === null) {
    return null;
  }

  const named = plan.groups.items.find((group) =>
    plan.filePath.includes(`/${group.name}/`)
  );

  if (named) {
    return named.name;
  }

  return plan.groups.items.at(0)?.name ?? null;
};

const toGroupOf = (
  plan: ScreenPlanWire | null,
  name: string | null
): PlanGroup | null => {
  if (plan === null || name === null) {
    return null;
  }

  return plan.groups.items.find((group) => group.name === name) ?? null;
};

export {
  LAYOUT_OPTIONS,
  hasPath,
  toCopyPath,
  toGroupOf,
  toPickedGroup,
  toTrimmedPath,
};

export type { LayoutOption, PlanGroup, ScreenLayoutId, ScreenPlanWire };
