import { LAYER_REF, layerKey } from "../../shared/layer-ref.js";
import { onSourceChange } from "../events/index.js";
import type { SourceChange } from "../events/index.js";
import type { PreviewService } from "../preview/index.js";
import { onProbePage } from "../preview/probe-page.js";
import { isGoneRef, refForKey, remapIds } from "./layer-ids.js";
import type { Move } from "./layer-ids.js";
import { SCAN_SOURCE } from "./layer-scan-source.js";

interface Viewport {
  width: number;
  height: number;
}

interface RawLayer {
  parent: number;
  depth: number;
  tag: string;
  path: string;
  nth: number;
  sib: number;
  own: string | null;
  used: string | null;
  comp: string | null;
  text: string;
  childCount: number;
  hidden: boolean;
}

interface Layer extends RawLayer {
  ref: string;
  key: string;
}

interface ScanInput {
  root: string | null;
  depth: number;
  max: number;
  paths: string[] | null;
  all: boolean;
}

interface ScanResult {
  layers: RawLayer[];
  truncated: boolean;
  missingRoot: boolean;
  roots: number[] | null;
}

interface ScanPage {
  evaluate: <Value>(expression: string) => Promise<Value>;
}

interface Memo {
  key: string;
  path: string;
  pageName: string | undefined;
}

interface ProbeTarget {
  readonly preview: PreviewService;
  readonly url: string;
  readonly viewport: Viewport;
  readonly scope: string;
}

interface ScanOptions {
  root: string | null;
  depth: number;
  max: number;
}

interface LookUpRequest {
  readonly known: (Memo | undefined)[];
  readonly isLast: boolean;
  readonly isLayoutOnly: boolean;
  readonly wanted: string[];
}

interface PathMatch<Value> {
  layers: (Layer | null)[];
  extra: Value;
}

const toProbeTarget = (
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string
): ProbeTarget => ({ preview, scope, url, viewport });

const MEMO_MAX = 20_000;
const memo = new Map<string, Memo>();

const scopeOf = (projectId: string, directionId: string): string =>
  `${projectId}/${directionId}`;

const isLayerRef = (value: unknown): value is string =>
  typeof value === "string" && LAYER_REF.test(value.trim());

const toBaseKey = (raw: RawLayer, keys: string[]): string => {
  if (raw.own) {
    return layerKey(raw.own, raw.used, raw.nth);
  }

  let parentKey = "body";

  if (raw.parent >= 0) {
    parentKey = keys[raw.parent] as string;
  }

  return `${parentKey}/${raw.tag}:${raw.sib}`;
};

const toUniqueKey = (base: string, count: number): string => {
  if (count === 0) {
    return base;
  }

  return `${base}~${count}`;
};

const keyed = (raws: RawLayer[], scope: string): Layer[] => {
  const keys: string[] = [];
  const seen = new Map<string, number>();

  return raws.map((raw, index) => {
    const base = toBaseKey(raw, keys);
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    const key = toUniqueKey(base, count);

    keys[index] = key;

    return { ...raw, key, ref: refForKey(scope, key) };
  });
};

const scanIn = (page: ScanPage, input: ScanInput): Promise<ScanResult> =>
  page.evaluate<ScanResult>(`(${SCAN_SOURCE})(${JSON.stringify(input)})`);

const onPage = <Value>(
  target: ProbeTarget,
  task: (page: ScanPage) => Promise<Value>,
  layoutOnly: boolean
): Promise<Value> =>
  onProbePage(target.preview, target.url, target.viewport, task, {
    layoutOnly,
  });

const remember = (
  scope: string,
  page: string | undefined,
  layers: Layer[]
): void => {
  if (memo.size > MEMO_MAX) {
    memo.clear();
  }

  for (const layer of layers) {
    memo.set(`${scope}|${layer.ref}`, {
      key: layer.key,
      pageName: page,
      path: layer.path,
    });
  }
};

const applyMove = (scope: string, move: Move, known: Memo): void => {
  if (move.to === null) {
    memo.delete(`${scope}|${move.ref}`);
  } else {
    memo.set(`${scope}|${move.ref}`, { ...known, key: move.to });
  }
};

const remapMemo = (change: SourceChange): void => {
  const scope = scopeOf(change.projectId, change.directionId);

  for (const move of remapIds(scope, change.files)) {
    const known = memo.get(`${scope}|${move.ref}`);

    if (known) {
      applyMove(scope, move, known);
    }
  }
};

const pageProbe = {
  start(): () => void {
    return onSourceChange(remapMemo);
  },
};

const memoPage = (scope: string, ref: string): string | undefined =>
  memo.get(`${scope}|${ref}`)?.pageName;

const scanLayers = async (
  target: ProbeTarget,
  page: string | undefined,
  options: ScanOptions
): Promise<{ layers: Layer[]; truncated: boolean } | null> => {
  const found = await onPage(
    target,
    (probe) => scanIn(probe, { ...options, all: false, paths: null }),
    false
  );

  if (found.missingRoot) {
    return null;
  }

  const layers = keyed(found.layers, target.scope);

  remember(target.scope, page, layers);

  return { layers, truncated: found.truncated };
};

class LayerRefError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LayerRefError";
  }
}

const quickHits = (
  scope: string,
  refs: string[],
  found: ScanResult
): Map<string, string> => {
  const layers = keyed(found.layers, scope);
  const hits = new Map<string, string>();

  for (const [index, ref] of refs.entries()) {
    const at = found.roots?.[index] ?? -1;
    const layer = layers[at];

    if (at >= 0 && layer?.ref === ref) {
      hits.set(ref, layer.path);
    }
  }

  return hits;
};

const toRefError = (
  ref: string,
  count: number,
  page: string | undefined
): LayerRefError => {
  if (count > 1) {
    return new LayerRefError(
      `Layer id ${ref} matches ${count} elements on this page. Call get_layers again and use a CSS selector for this element.`
    );
  }

  let where = "";

  if (page) {
    where = ` (${page})`;
  }

  return new LayerRefError(
    `No element with layer id ${ref} on this page${where}. It was removed, or it is on another page, or the file changed outside the studio: call get_layers again for fresh ids.`
  );
};

type LookUp = Map<string, string> | LayerRefError | null;

const toFullScan = async (
  page: ScanPage,
  scope: string,
  missing: string[],
  request: LookUpRequest
): Promise<LookUp | Map<string, string>> => {
  const scan = await scanIn(page, {
    all: true,
    depth: 0,
    max: 0,
    paths: null,
    root: null,
  });

  const all = keyed(scan.layers, scope);
  const hits = new Map<string, string>();

  for (const ref of missing) {
    const found = all.filter((layer) => layer.ref === ref);
    const memoized = request.known[request.wanted.indexOf(ref)]?.pageName;

    if (found.length !== 1) {
      return toRefError(ref, found.length, memoized);
    }

    remember(scope, memoized, found);
    hits.set(ref, (found[0] as Layer).path);
  }

  return hits;
};

const lookUp = (target: ProbeTarget, request: LookUpRequest): Promise<LookUp> =>
  onPage<LookUp>(
    target,
    async (page) => {
      const hits = quickHits(
        target.scope,
        request.wanted,
        await scanIn(page, {
          all: false,
          depth: 0,
          max: 0,
          paths: request.known.map((item) => item?.path ?? ""),
          root: null,
        })
      );

      const missing = request.wanted.filter((ref) => !hits.has(ref));

      if (missing.length === 0) {
        return hits;
      }

      if (
        !request.isLast &&
        missing.some((ref) => !isGoneRef(target.scope, ref))
      ) {
        return null;
      }

      const rest = await toFullScan(page, target.scope, missing, request);

      if (rest instanceof LayerRefError) {
        return rest;
      }

      return new Map([...hits, ...(rest as Map<string, string>)]);
    },
    request.isLayoutOnly
  );

const getLayerRefPaths = async (
  target: ProbeTarget,
  refs: string[],
  layoutOnly: boolean
): Promise<Map<string, string>> => {
  const wanted = [...new Set(refs)];
  const known = wanted.map((ref) => memo.get(`${target.scope}|${ref}`));

  let found = await lookUp(target, {
    isLast: false,
    isLayoutOnly: layoutOnly,
    known,
    wanted,
  });

  if (found === null && layoutOnly) {
    found = await lookUp(target, {
      isLast: true,
      isLayoutOnly: true,
      known,
      wanted,
    });
  }

  if (found === null || (found instanceof LayerRefError && layoutOnly)) {
    found = await lookUp(target, {
      isLast: true,
      isLayoutOnly: false,
      known,
      wanted,
    });
  }

  if (found instanceof LayerRefError) {
    throw found;
  }

  return found as Map<string, string>;
};

const resolveLayerRefs = (
  target: ProbeTarget,
  refs: string[]
): Promise<Map<string, string>> => getLayerRefPaths(target, refs, false);

const resolveLayerRef = async (
  target: ProbeTarget,
  ref: string
): Promise<string> => {
  const paths = await getLayerRefPaths(target, [ref], false);

  return paths.get(ref) as string;
};

const layersAtPaths = <Value>(
  target: ProbeTarget,
  page: string | undefined,
  find: (probe: ScanPage) => Promise<{ paths: string[]; extra: Value }>
): Promise<PathMatch<Value>> =>
  onPage(
    target,
    async (probe) => {
      const found = await find(probe);

      if (found.paths.length === 0) {
        return { extra: found.extra, layers: [] };
      }

      const scan = await scanIn(probe, {
        all: false,
        depth: 0,
        max: 0,
        paths: found.paths,
        root: null,
      });

      const layers = keyed(scan.layers, target.scope);

      const picked = [...found.paths.keys()].map((index) => {
        const at = scan.roots?.[index] ?? -1;

        return layers[at] ?? null;
      });

      remember(
        target.scope,
        page,
        picked.filter((layer): layer is Layer => layer !== null)
      );

      return { extra: found.extra, layers: picked };
    },
    false
  );

export {
  toProbeTarget,
  scopeOf,
  isLayerRef,
  pageProbe,
  memoPage,
  scanLayers,
  LayerRefError,
  resolveLayerRefs,
  getLayerRefPaths,
  resolveLayerRef,
  layersAtPaths,
};

export type { Viewport, RawLayer, Layer, PathMatch, ProbeTarget };
