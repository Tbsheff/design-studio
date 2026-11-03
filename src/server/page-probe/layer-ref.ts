import { LAYER_REF, layerKey } from "../../shared/layer-ref.js";
import { onSourceChange } from "../direct-edit/change-feed.js";
import type { SourceChange } from "../direct-edit/change-feed.js";
import type { PreviewService } from "../preview/index.js";
import { onProbePage } from "../preview/probe-page.js";
import { isGoneRef, refForKey, remapIds } from "./layer-ids.js";
import { SCAN_SOURCE } from "./layer-ref.probe.js";

export interface Viewport {
  width: number;
  height: number;
}

export interface RawLayer {
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

export interface Layer extends RawLayer {
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

type ScanPage = { evaluate<T>(expression: string): Promise<T> };

interface Memo {
  key: string;
  path: string;
  page: string | undefined;
}

const MEMO_MAX = 20_000;
const memo = new Map<string, Memo>();

export function scopeOf(projectId: string, directionId: string): string {
  return `${projectId}/${directionId}`;
}

export function isLayerRef(value: unknown): value is string {
  return typeof value === "string" && LAYER_REF.test(value.trim());
}

function keyed(raws: RawLayer[], scope: string): Layer[] {
  const keys: string[] = [];
  const seen = new Map<string, number>();
  return raws.map((raw, index) => {
    const parentKey = raw.parent >= 0 ? (keys[raw.parent] as string) : "body";
    const base = raw.own
      ? layerKey(raw.own, raw.used, raw.nth)
      : `${parentKey}/${raw.tag}:${raw.sib}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    const key = count === 0 ? base : `${base}~${count}`;
    keys[index] = key;
    return { ...raw, key, ref: refForKey(scope, key) };
  });
}

function scanIn(page: ScanPage, input: ScanInput): Promise<ScanResult> {
  return page.evaluate<ScanResult>(
    `(${SCAN_SOURCE})(${JSON.stringify(input)})`
  );
}

async function onPage<T>(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  task: (page: ScanPage) => Promise<T>,
  layoutOnly = false
): Promise<T> {
  return onProbePage(preview, url, viewport, task, { layoutOnly });
}

function remember(
  scope: string,
  page: string | undefined,
  layers: Layer[]
): void {
  if (memo.size > MEMO_MAX) memo.clear();
  for (const layer of layers)
    memo.set(`${scope}|${layer.ref}`, {
      key: layer.key,
      path: layer.path,
      page,
    });
}

function remapMemo(change: SourceChange): void {
  const scope = scopeOf(change.projectId, change.directionId);
  for (const move of remapIds(scope, change.files)) {
    const known = memo.get(`${scope}|${move.ref}`);
    if (!known) continue;
    if (move.to === null) memo.delete(`${scope}|${move.ref}`);
    else memo.set(`${scope}|${move.ref}`, { ...known, key: move.to });
  }
}

export const pageProbe = {
  start(): () => void {
    return onSourceChange(remapMemo);
  },
};

export function memoPage(scope: string, ref: string): string | undefined {
  return memo.get(`${scope}|${ref}`)?.page;
}

export async function scanLayers(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string,
  page: string | undefined,
  options: { root: string | null; depth: number; max: number }
): Promise<{ layers: Layer[]; truncated: boolean } | null> {
  const found = await onPage(preview, url, viewport, (page) =>
    scanIn(page, { ...options, paths: null, all: false })
  );
  if (found.missingRoot) return null;
  const layers = keyed(found.layers, scope);
  remember(scope, page, layers);
  return { layers, truncated: found.truncated };
}

export class LayerRefError extends Error {}

function quickHits(
  scope: string,
  refs: string[],
  found: ScanResult
): Map<string, string> {
  const layers = keyed(found.layers, scope);
  const hits = new Map<string, string>();
  refs.forEach((ref, index) => {
    const at = found.roots?.[index] ?? -1;
    const layer = at >= 0 ? layers[at] : undefined;
    if (layer?.ref === ref) hits.set(ref, layer.path);
  });
  return hits;
}

function refError(
  ref: string,
  count: number,
  page: string | undefined
): LayerRefError {
  if (count > 1)
    return new LayerRefError(
      `Layer id ${ref} matches ${count} elements on this page. Call get_layers again and use a CSS selector for this element.`
    );
  return new LayerRefError(
    `No element with layer id ${ref} on this page${page ? ` (${page})` : ""}. It was removed, or it is on another page, or the file changed outside the studio: call get_layers again for fresh ids.`
  );
}

type LookUp = Map<string, string> | LayerRefError | null;

function lookUp(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string,
  wanted: string[],
  known: (Memo | undefined)[],
  last: boolean,
  layoutOnly: boolean
): Promise<LookUp> {
  return onPage<LookUp>(
    preview,
    url,
    viewport,
    async (page) => {
      const hits = quickHits(
        scope,
        wanted,
        await scanIn(page, {
          root: null,
          depth: 0,
          max: 0,
          paths: known.map((item) => item?.path ?? ""),
          all: false,
        })
      );
      const missing = wanted.filter((ref) => !hits.has(ref));
      if (missing.length === 0) return hits;
      if (!last && missing.some((ref) => !isGoneRef(scope, ref))) return null;
      const all = keyed(
        (
          await scanIn(page, {
            root: null,
            depth: 0,
            max: 0,
            paths: null,
            all: true,
          })
        ).layers,
        scope
      );
      for (const ref of missing) {
        const found = all.filter((layer) => layer.ref === ref);
        const page = known[wanted.indexOf(ref)]?.page;
        if (found.length !== 1) return refError(ref, found.length, page);
        remember(scope, page, found);
        hits.set(ref, (found[0] as Layer).path);
      }
      return hits;
    },
    layoutOnly
  );
}

export async function resolveLayerRefs(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string,
  refs: string[],
  layoutOnly = false
): Promise<Map<string, string>> {
  const wanted = [...new Set(refs)];
  const known = wanted.map((ref) => memo.get(`${scope}|${ref}`));
  let found = await lookUp(
    preview,
    url,
    viewport,
    scope,
    wanted,
    known,
    false,
    layoutOnly
  );
  if (found === null && layoutOnly)
    found = await lookUp(
      preview,
      url,
      viewport,
      scope,
      wanted,
      known,
      true,
      true
    );
  if (found === null || (found instanceof LayerRefError && layoutOnly))
    found = await lookUp(
      preview,
      url,
      viewport,
      scope,
      wanted,
      known,
      true,
      false
    );
  if (found instanceof LayerRefError) throw found;
  return found as Map<string, string>;
}

export async function resolveLayerRef(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string,
  ref: string
): Promise<string> {
  return (await resolveLayerRefs(preview, url, viewport, scope, [ref])).get(
    ref
  ) as string;
}

export interface PathMatch<T> {
  layers: (Layer | null)[];
  extra: T;
}

export async function layersAtPaths<T>(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  scope: string,
  page: string | undefined,
  find: (probe: ScanPage) => Promise<{ paths: string[]; extra: T }>
): Promise<PathMatch<T>> {
  return onPage(preview, url, viewport, async (probe) => {
    const found = await find(probe);
    if (found.paths.length === 0) return { layers: [], extra: found.extra };
    const scan = await scanIn(probe, {
      root: null,
      depth: 0,
      max: 0,
      paths: found.paths,
      all: false,
    });
    const layers = keyed(scan.layers, scope);
    const picked = found.paths.map((_, index) => {
      const at = scan.roots?.[index] ?? -1;
      return at >= 0 ? (layers[at] ?? null) : null;
    });
    remember(
      scope,
      page,
      picked.filter((layer): layer is Layer => layer !== null)
    );
    return { layers: picked, extra: found.extra };
  });
}
