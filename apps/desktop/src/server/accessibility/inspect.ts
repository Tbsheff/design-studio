import { contrastPairsOf } from "./contrast.js";
import { ACCESSIBILITY_LIST_MAX, parseLoc, probeOnPage } from "./deps.js";
import type {
  AccessibilityReport,
  AccessibleNode,
  CompiledTokenEntry,
  MissingAlt,
  NameSource,
  PreviewService,
  TabStop,
} from "./deps.js";
import { AccessibilityError } from "./errors.js";
import { accessibilityProbe } from "./probe.js";
import type { RawImage, RawNode, RawProbe, RawTab } from "./probe.js";

interface InspectRequest {
  readonly frame: string;
  readonly page: string;
  readonly passing: boolean;
  readonly root: string | null;
  readonly url: string;
  readonly viewport: { readonly height: number; readonly width: number };
}

const toNode = (raw: RawNode): AccessibleNode => ({
  name: raw.name,
  nameFrom: raw.nameFrom as NameSource,
  role: raw.role,
  selector: raw.selector,
  source: parseLoc(raw.loc),
  tag: raw.tag,
});

const toStop = (raw: RawTab, index: number): TabStop => ({
  ...toNode(raw),
  order: index + 1,
  tabIndex: raw.tabIndex,
});

const toMissing = (raw: RawImage): MissingAlt => ({
  selector: raw.selector,
  source: parseLoc(raw.loc),
  src: raw.src,
  tag: raw.tag,
});

const rootOf = (raw: RawProbe): AccessibleNode | null => {
  if (raw.root === null) {
    return null;
  }

  return toNode(raw.root);
};

const inspectAccessibility = async (
  preview: Pick<PreviewService, "peekPage" | "withPage">,
  entries: readonly CompiledTokenEntry[],
  request: InspectRequest
): Promise<AccessibilityReport> => {
  const raw = await probeOnPage<RawProbe>(
    preview,
    request.url,
    { height: request.viewport.height, width: request.viewport.width },
    accessibilityProbe({ max: ACCESSIBILITY_LIST_MAX, root: request.root })
  );

  if (raw.missingRoot) {
    throw new AccessibilityError(
      `No element matches ${request.root ?? "the layer"} on the page.`
    );
  }

  const pairs = contrastPairsOf(request.frame, raw.texts, entries);
  const low = pairs.filter((pair) => !pair.passes);
  let contrast = low;

  if (request.passing) {
    contrast = pairs;
  }

  return {
    contrast,
    frame: request.frame,
    lowContrast: low.length,
    missingAlt: raw.images.map(toMissing),
    page: request.page,
    root: rootOf(raw),
    tabOrder: raw.tabs.map(toStop),
    truncated: raw.truncated,
    unnamed: raw.unnamed.map(toNode),
  };
};

export { inspectAccessibility };

export type { InspectRequest };
