import type {
  ComponentUse,
  SelectionContext,
  SourceLoc,
  TextSourceHints,
} from "../../shared/contracts.js";
import type { ComponentOwner } from "../../shared/props.js";
import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import { probe, probeAll } from "./element.probe.js";
import { parseLoc } from "./owner-probe.js";

interface RawElement {
  tag: string;
  text: string;
  outerHTML: string;
  styles: Record<string, string>;
  rect: { x: number; y: number; width: number; height: number };
  loc: string | null;
  usedAt: string | null;
  usedBy: ComponentUse | null;
  owners: ComponentOwner[];
  ancestors: string[];
}

function contextOf(selector: string, raw: RawElement): SelectionContext {
  return {
    selector,
    tag: raw.tag,
    text: raw.text,
    outerHTML: raw.outerHTML,
    styles: raw.styles,
    rect: raw.rect,
    source: parseLoc(raw.loc),
    usedAt: parseLoc(raw.usedAt),
    usedBy: raw.usedBy,
    owners: raw.owners ?? [],
    ancestors: raw.ancestors,
  };
}

const PROBE_VIEWPORT = { width: 1440, height: 900 };

function onProbePage<T>(
  preview: PreviewService,
  url: string,
  expression: string
): Promise<T> {
  return probeOnPage<T>(preview, url, PROBE_VIEWPORT, expression);
}

export async function describeElements(
  preview: PreviewService,
  url: string,
  selectors: string[]
): Promise<(SelectionContext | null)[]> {
  const raws = await onProbePage<(RawElement | null)[]>(
    preview,
    url,
    probeAll(selectors)
  );
  return selectors.map((selector, index) => {
    const raw = raws[index];
    return raw ? contextOf(selector, raw) : null;
  });
}

export async function describeElement(
  preview: PreviewService,
  url: string,
  selector: string
): Promise<SelectionContext | null> {
  const raw = await onProbePage<RawElement | null>(
    preview,
    url,
    probe(selector)
  );
  return raw ? contextOf(selector, raw) : null;
}

export function textHintsOf(element: SelectionContext): TextSourceHints {
  return {
    text: element.text,
    ...(element.usedAt ? { usedAt: element.usedAt } : {}),
    ...(element.owners?.length ? { owners: element.owners } : {}),
  };
}
