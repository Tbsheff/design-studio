import path from "node:path";

import { cleanPortRoute } from "@design-studio/contracts/port";
import type {
  PortFlowLink,
  PortFlowPage,
  PortFlowPlan,
} from "@design-studio/contracts/port";

import { appRouterDir } from "../app/index.js";
import { buildFlowPlan, buildPortPlan, portRouteUrl } from "./port-plan.js";
import type { PortFlowInput } from "./port-plan.js";
import {
  isRouteCopyOf,
  toCopyEntry,
  toDiffText,
  toUpdateOf,
  toUpdateTag,
} from "./port-route-update.js";
import type { RouteUpdate, RouteUpdateInput } from "./port-route-update.js";
import type { StartableInput } from "./port-start-prompt.js";

interface FlowRouteBlock {
  readonly file: string;
  readonly path: string;
  readonly text: string;
}

type FlowTarget = NonNullable<PortFlowInput["target"]>;

interface FlowMove {
  readonly from: string;
  readonly to: string;
}

interface CopyRoute {
  readonly route: string;
  readonly url: string;
}

interface FlowCheckRoute {
  readonly path: string;
  readonly route: string | null;
}

type CopySource = Pick<PortFlowInput["source"], "direction">;

const FULL_UPDATES_MAX = 3;

const DIFF_TEXT_MAX = 24_000;

const UPDATE_TAG = "route-update";

const DIFF_TAG = "route-file-diff";

const FLOW_UPDATE_LINES = [
  "These route files exist in the app. Update them in place. Do not make new routes for these pages.",
  "Each route-update block below names one existing route file. Its rules apply to that file. Keep the data reads of every file.",
  "Link the pages with the app paths of the link map. A path with a [segment] (for example /visits/[id]) is a dynamic route: build the href from the row data, for example the visit id in place of [id].",
  "When you call apply_port or inspect_port for a dynamic route, pass a real path as routePath, for example /visits/1.",
];

const toSegments = (url: string): string[] => url.split("/").filter(Boolean);

const isUnderBase = (base: string, route: string): boolean => {
  const head = toSegments(portRouteUrl(base));
  const parts = toSegments(portRouteUrl(route));

  return (
    head.length <= parts.length &&
    head.every((part, index) => parts[index] === part)
  );
};

const toRouteOfFile = (target: FlowTarget, file: string): string | null => {
  const appDir = target.project.app?.appDir ?? "";
  const router = appRouterDir(path.join(target.direction.workTree, appDir));

  if (router === null) {
    return null;
  }

  const folder = path.dirname(
    path.relative(router, path.join(target.direction.workTree, file))
  );

  if (folder === "." || folder.startsWith("..")) {
    return null;
  }

  return cleanPortRoute(folder.split(path.sep).join("/"));
};

const isDynamicRoute = (route: string): boolean =>
  route
    .split("/")
    .some(
      (part) => part.length > 2 && part.startsWith("[") && part.endsWith("]")
    );

const toCopyRoute = async (
  source: CopySource,
  target: FlowTarget,
  page: string
): Promise<CopyRoute | null> => {
  const entry = await toCopyEntry({
    source: { direction: source.direction, path: page },
    target: { direction: target.direction, project: target.project, route: "" },
  });

  const file = entry?.files[0]?.file ?? null;

  if (entry?.appProjectId !== target.project.id || file === null) {
    return null;
  }

  const route = toRouteOfFile(target, file);

  if (route === null) {
    return null;
  }

  return { route, url: portRouteUrl(entry.routePath) };
};

const isCopyUnderBase = (base: string, copy: CopyRoute): boolean =>
  isUnderBase(base, copy.route) || isUnderBase(base, copy.url);

const toPatternRoute = async (
  source: CopySource,
  target: FlowTarget & { readonly route: string },
  page: string
): Promise<string> => {
  const copy = await toCopyRoute(source, target, page);

  if (copy === null || !isDynamicRoute(copy.route)) {
    return target.route;
  }

  if (copy.url !== portRouteUrl(target.route)) {
    return target.route;
  }

  return copy.route;
};

const toCheckRoute = async (
  source: CopySource,
  target: FlowTarget,
  page: Pick<PortFlowPage, "path" | "route">
): Promise<FlowCheckRoute> => {
  if (!isDynamicRoute(page.route)) {
    return { path: page.path, route: page.route };
  }

  const copy = await toCopyRoute(source, target, page.path);

  if (copy === null || portRouteUrl(copy.route) !== portRouteUrl(page.route)) {
    return { path: page.path, route: null };
  }

  return { path: page.path, route: copy.url };
};

const listFlowCheckRoutes = (
  input: StartableInput,
  pages: readonly Pick<PortFlowPage, "path" | "route">[]
): Promise<FlowCheckRoute[]> =>
  Promise.all(
    pages.map((page) => toCheckRoute(input.source, input.target, page))
  );

const toWantedRoutes = async (
  input: PortFlowInput,
  flow: PortFlowPlan
): Promise<(string | null)[]> => {
  const { target } = input;
  const base = flow.base ?? null;

  if (target === null || base === null) {
    return flow.pages.map(() => null);
  }

  const copies = await Promise.all(
    flow.pages.map((page) => toCopyRoute(input.source, target, page.path))
  );

  return copies.map((copy) => {
    if (copy === null || !isCopyUnderBase(base, copy)) {
      return null;
    }

    return copy.route;
  });
};

const toPickedRoutes = (
  pages: readonly PortFlowPage[],
  wanted: readonly (string | null)[]
): string[] => {
  const used = new Set<string>();

  return pages.map((page, index) => {
    const route = wanted[index] ?? null;
    let picked = page.route;

    if (route !== null && !used.has(portRouteUrl(route))) {
      picked = route;
    }

    used.add(portRouteUrl(picked));

    return picked;
  });
};

const toMovedPage = async (
  input: PortFlowInput,
  page: PortFlowPage,
  route: string
): Promise<PortFlowPage> => {
  if (route === page.route || input.target === null) {
    return page;
  }

  const plan = await buildPortPlan({
    source: { ...input.source, path: page.path },
    target: { ...input.target, route },
  });

  return {
    ...page,
    plan,
    route,
    routeExists: plan.target?.routeExists ?? false,
    routeFile: plan.target?.routeFile ?? null,
    url: portRouteUrl(route),
  };
};

const toMovedLink = (
  link: PortFlowLink,
  moves: ReadonlyMap<string, FlowMove>
): PortFlowLink => {
  const move = moves.get(link.page) ?? null;

  if (move === null || !link.to.startsWith(move.from)) {
    return link;
  }

  return { ...link, to: `${move.to}${link.to.slice(move.from.length)}` };
};

const toMovedPlan = async (
  input: PortFlowInput,
  flow: PortFlowPlan
): Promise<PortFlowPlan> => {
  const wanted = await toWantedRoutes(input, flow);
  const routes = toPickedRoutes(flow.pages, wanted);

  const pages = await Promise.all(
    flow.pages.map((page, index) =>
      toMovedPage(input, page, routes[index] ?? page.route)
    )
  );

  const moves = new Map<string, FlowMove>();

  for (const [index, page] of pages.entries()) {
    const before = flow.pages[index] ?? null;

    if (before !== null && before.url !== page.url) {
      moves.set(page.path, { from: before.url, to: page.url });
    }
  }

  return {
    ...flow,
    links: flow.links.map((link) => toMovedLink(link, moves)),
    pages,
  };
};

const toFlowUpdatePlan = async (input: PortFlowInput): Promise<PortFlowPlan> =>
  toMovedPlan(input, await buildFlowPlan(input));

const toPageInput = (
  input: StartableInput,
  page: PortFlowPage
): RouteUpdateInput => ({
  source: { direction: input.source.direction, path: page.path },
  target: {
    direction: input.target.direction,
    project: input.target.project,
    route: page.route,
  },
});

const toFlowRouteUpdate = async (
  input: StartableInput,
  page: PortFlowPage
): Promise<RouteUpdate | null> => {
  const file = page.routeFile;

  if (!page.routeExists || file === null) {
    return null;
  }

  const pageInput = toPageInput(input, page);
  const entry = await toCopyEntry(pageInput);

  if (!isRouteCopyOf(pageInput, entry, file)) {
    return toUpdateOf(pageInput, file, null);
  }

  return toUpdateOf(pageInput, file, entry);
};

const toTag = (name: string, isClose: boolean): string => {
  if (isClose) {
    return ["</", name, ">"].join("");
  }

  return ["<", name, ">"].join("");
};

const toShortTag = (update: RouteUpdate): string => {
  const diff = toDiffText(update).slice(0, DIFF_TEXT_MAX);

  const lines = [
    "The route file exists in the app. Update it in place. Do not make a new route. Its text is not in this prompt: read the file first.",
  ];

  if (diff !== "") {
    lines.push(
      "The app route changed since the copy. Keep the app change.",
      [toTag(DIFF_TAG, false), diff, toTag(DIFF_TAG, true)].join("\n")
    );
  }

  return [
    ["<", UPDATE_TAG, ' file="', update.file, '">'].join(""),
    ...lines,
    toTag(UPDATE_TAG, true),
  ].join("\n");
};

const listFlowRouteBlocks = async (
  input: StartableInput,
  flow: PortFlowPlan
): Promise<FlowRouteBlock[]> => {
  const updates = await Promise.all(
    flow.pages.map((page) => toFlowRouteUpdate(input, page))
  );

  const blocks: FlowRouteBlock[] = [];

  for (const [index, update] of updates.entries()) {
    const page = flow.pages[index] ?? null;

    if (update !== null && page !== null) {
      let text = toUpdateTag(update);

      if (blocks.length >= FULL_UPDATES_MAX) {
        text = toShortTag(update);
      }

      blocks.push({ file: update.file, path: page.path, text });
    }
  }

  return blocks;
};

const toFlowUpdateLead = (blocks: readonly FlowRouteBlock[]): string => {
  if (blocks.length === 0) {
    return "";
  }

  const files = blocks.map((block) => `\`${block.file}\``).join(", ");

  return [`Existing route files: ${files}.`, ...FLOW_UPDATE_LINES].join("\n");
};

export {
  isDynamicRoute,
  listFlowCheckRoutes,
  listFlowRouteBlocks,
  toFlowUpdateLead,
  toFlowUpdatePlan,
  toPatternRoute,
};

export type { FlowCheckRoute, FlowRouteBlock };
