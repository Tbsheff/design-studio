import type {
  ComponentUse,
  SelectionContext,
  TextSourceHints,
} from "@design-studio/contracts";
import type { ComponentOwner } from "@design-studio/contracts/props";

import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import {
  toElementProbeSource,
  toElementsProbeSource,
} from "../preview/probe-source/index.js";
import { parseLoc } from "./owner-probe.js";

interface RawElement {
  tag: string;
  text: string;
  outerHTML: string;
  styles: Record<string, string>;
  rect: SelectionContext["rect"];
  loc: string | null;
  usedAt: string | null;
  usedBy: ComponentUse | null;
  owners: ComponentOwner[];
  ancestors: string[];
}

const contextOf = (
  selectorText: string,
  raw: RawElement
): SelectionContext => ({
  ancestors: raw.ancestors,
  outerHTML: raw.outerHTML,
  owners: raw.owners ?? [],
  rect: raw.rect,
  selector: selectorText,
  source: parseLoc(raw.loc),
  styles: raw.styles,
  tag: raw.tag,
  text: raw.text,
  usedAt: parseLoc(raw.usedAt),
  usedBy: raw.usedBy,
});

const PROBE_VIEWPORT = { height: 900, width: 1440 };

const onProbePage = <Value>(
  preview: PreviewService,
  url: string,
  expression: string
): Promise<Value> =>
  probeOnPage<Value>(preview, url, PROBE_VIEWPORT, expression);

const describeElements = async (
  preview: PreviewService,
  url: string,
  selectors: string[]
): Promise<(SelectionContext | null)[]> => {
  const raws = await onProbePage<(RawElement | null)[]>(
    preview,
    url,
    toElementsProbeSource(selectors)
  );

  return selectors.map((selector, index) => {
    const raw = raws[index];

    if (raw) {
      return contextOf(selector, raw);
    }

    return null;
  });
};

const describeElement = async (
  preview: PreviewService,
  url: string,
  selector: string
): Promise<SelectionContext | null> => {
  const raw = await onProbePage<RawElement | null>(
    preview,
    url,
    toElementProbeSource(selector)
  );

  if (raw) {
    return contextOf(selector, raw);
  }

  return null;
};

const textHintsOf = (element: SelectionContext): TextSourceHints => {
  const hints: TextSourceHints = { text: element.text };

  if (element.usedAt) {
    hints.usedAt = element.usedAt;
  }

  if (element.owners?.length) {
    hints.owners = element.owners;
  }

  return hints;
};

export { describeElements, describeElement, textHintsOf };
