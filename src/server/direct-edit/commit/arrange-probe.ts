import type {
  ArrangeFacts,
  ArrangeParentFacts,
  ArrangeTargetFacts,
} from "../../../shared/arrange-plan.js";
import type { MeasureRect } from "../../../shared/arrange.js";
import type { ComponentUse, SourceLoc } from "../../../shared/contracts.js";
import { parseLoc } from "../../components/owner-probe.js";
import { probeOnPage } from "../../preview/probe-page.js";
import type { PreviewService } from "../../types.js";
import { probeExpression, rectsExpression } from "./arrange-probe.probe.js";

type Viewport = { width: number; height: number };

interface RawSource {
  loc: string | null;
  usedAt: string | null;
  usedBy: ComponentUse | null;
}

type RawTarget = Omit<ArrangeTargetFacts, "source"> & RawSource;

type RawParent = Omit<ArrangeParentFacts, "source"> & RawSource;

type RawProbe =
  | { error: string }
  | {
      targets: RawTarget[];
      parent: RawParent | null;
      sameParent: boolean;
      container: MeasureRect | null;
    };

export interface ProbedSource {
  source: SourceLoc | null;
  usedAt: SourceLoc | null;
  usedBy: ComponentUse | null;
  tag: string;
}

export interface ArrangeProbe {
  facts: ArrangeFacts;
  sources: Map<string, ProbedSource>;
}

function sourceEntry(raw: RawSource & { tag: string }): ProbedSource {
  return {
    source: parseLoc(raw.loc),
    usedAt: parseLoc(raw.usedAt),
    usedBy: raw.usedBy,
    tag: raw.tag,
  };
}

export class ArrangeProbeError extends Error {}

export async function probeArrange(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  selectors: string[]
): Promise<ArrangeProbe> {
  const raw = await probeOnPage<RawProbe>(
    preview,
    url,
    viewport,
    probeExpression(selectors)
  );

  if ("error" in raw) {
    throw new ArrangeProbeError(raw.error);
  }

  const sources = new Map<string, ProbedSource>();

  const targets = raw.targets.map(({ loc, usedAt, usedBy, ...rest }) => {
    sources.set(
      rest.selector,
      sourceEntry({ loc, usedAt, usedBy, tag: rest.tag })
    );

    return { ...rest, source: parseLoc(loc) };
  });

  let parent: ArrangeParentFacts | null = null;

  if (raw.parent) {
    const { loc, usedAt, usedBy, ...rest } = raw.parent;

    if (!sources.has(rest.selector)) {
      sources.set(
        rest.selector,
        sourceEntry({ loc, usedAt, usedBy, tag: rest.tag })
      );
    }

    parent = { ...rest, source: parseLoc(loc) };
  }

  return {
    facts: {
      targets,
      parent,
      sameParent: raw.sameParent,
      container: raw.container,
    },
    sources,
  };
}

export async function probeRects(
  preview: PreviewService,
  url: string,
  viewport: Viewport,
  selectors: string[]
): Promise<(MeasureRect | null)[]> {
  return probeOnPage<(MeasureRect | null)[]>(
    preview,
    url,
    viewport,
    rectsExpression(selectors)
  );
}
