import {
  LayerRefError,
  SOURCE_LOC_ATTR,
  describeElements,
  isLayerRef,
  memoPage,
  resolveLayerRefs,
  resolveSourceLoc,
  scopeOf,
  toProbeTarget,
  withPagePath,
} from "./deps.js";
import type {
  ComponentUse,
  DirectEditRuntime,
  Direction,
  Project,
  SourceLoc,
} from "./deps.js";
import type { ReadProperty, StyleDeclaration } from "./engine/index.js";
import { toProbeLayers } from "./layer-style-probe.js";

interface ResolveScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly runtime: DirectEditRuntime;
}

interface ResolvedLayer {
  readonly count: number;
  readonly layerId: string;
  readonly selector: string;
  readonly source: SourceLoc | null;
  readonly styles: readonly StyleDeclaration[];
  readonly usedBy: ComponentUse | null;
}

interface Located {
  readonly layerId: string;
  readonly loc: SourceLoc | null;
  readonly selector: string;
}

const PROBE_VIEWPORT = { height: 900, width: 1440 } as const;

const toLocSelector = (loc: SourceLoc): string =>
  `[${SOURCE_LOC_ATTR}="${loc.file}:${loc.line}:${loc.col}"]`;

const toPageOf = (scope: string, layerId: string): string => {
  if (!isLayerRef(layerId)) {
    return "";
  }

  return memoPage(scope, layerId.trim()) ?? "";
};

const toGroupedByPage = (
  scope: string,
  layerIds: readonly string[]
): Map<string, string[]> => {
  const pages = new Map<string, string[]>();

  for (const layerId of layerIds) {
    const page = toPageOf(scope, layerId);
    pages.set(page, [...(pages.get(page) ?? []), layerId]);
  }

  return pages;
};

const toLocate = async (
  scope: ResolveScope,
  url: string,
  layerIds: readonly string[]
): Promise<Located[]> => {
  const key = scopeOf(scope.project.id, scope.direction.id);

  const refs = layerIds.flatMap((id) => {
    if (isLayerRef(id)) {
      return [id.trim()];
    }

    return [];
  });

  let selectors = new Map<string, string>();

  if (refs.length > 0) {
    selectors = await resolveLayerRefs(
      toProbeTarget(scope.runtime.preview, url, PROBE_VIEWPORT, key),
      refs
    );
  }

  return Promise.all(
    layerIds.map(async (layerId) => {
      if (isLayerRef(layerId)) {
        return {
          layerId,
          loc: null,
          selector: selectors.get(layerId.trim()) ?? "",
        };
      }

      const loc = await resolveSourceLoc(
        scope.direction.workTree,
        key,
        layerId
      );

      return { layerId, loc, selector: toLocSelector(loc) };
    })
  );
};

const toResolved = (
  located: Located,
  context: Awaited<ReturnType<typeof describeElements>>[number],
  probed: Awaited<ReturnType<typeof toProbeLayers>>[number]
): ResolvedLayer => {
  if (context === null && located.loc === null) {
    throw new LayerRefError(
      `Layer ${located.layerId} is not on the page. Call get_layers for current ids.`
    );
  }

  return {
    count: probed?.count ?? 1,
    layerId: located.layerId,
    selector: located.selector,
    source: context?.source ?? located.loc,
    styles: probed?.styles ?? [],
    usedBy: context?.usedBy ?? null,
  };
};

const toResolvePage = async (
  scope: ResolveScope,
  base: string,
  page: string,
  request: {
    readonly layerIds: readonly string[];
    readonly properties: readonly ReadProperty[];
  }
): Promise<ResolvedLayer[]> => {
  let url = withPagePath(base);

  if (page !== "") {
    url = withPagePath(base, page);
  }

  const located = await toLocate(scope, url, request.layerIds);
  const selectors = located.map((entry) => entry.selector);

  const [contexts, probed] = await Promise.all([
    describeElements(scope.runtime.preview, url, selectors),
    toProbeLayers(scope.runtime.preview, url, selectors, request.properties),
  ]);

  return located.map((entry, index) =>
    toResolved(entry, contexts[index] ?? null, probed[index] ?? null)
  );
};

const toResolvedLayers = async (
  scope: ResolveScope,
  layerIds: readonly string[],
  properties: readonly ReadProperty[]
): Promise<ResolvedLayer[]> => {
  const pages = toGroupedByPage(
    scopeOf(scope.project.id, scope.direction.id),
    layerIds
  );

  const base = await scope.runtime.preview.directionUrl(
    scope.project,
    scope.direction
  );

  const resolved = await Promise.all(
    [...pages].map(([page, ids]) =>
      toResolvePage(scope, base, page, { layerIds: ids, properties })
    )
  );

  const byId = new Map(resolved.flat().map((entry) => [entry.layerId, entry]));

  return layerIds.flatMap((layerId) => byId.get(layerId) ?? []);
};

export { toResolvedLayers };

export type { ResolveScope, ResolvedLayer };
