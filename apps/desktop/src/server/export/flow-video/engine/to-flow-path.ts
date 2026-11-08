import type { PrototypeLink } from "@design-studio/contracts/links";

interface FlowFrame {
  readonly id: string;
}

interface FlowLinksDocument {
  readonly links: readonly PrototypeLink[];
  readonly start: string | null;
}

interface FlowLink {
  readonly action: "modal" | "drawer" | "navigate";
  readonly fromFrame: string;
  readonly id: string;
  readonly selector: string;
  readonly toFrame: string;
}

type FlowPathResult =
  | {
      readonly code: "link-missing";
      readonly isOk: false;
      readonly linkId: string;
    }
  | {
      readonly code: "link-broken";
      readonly isOk: false;
      readonly linkId: string;
    }
  | {
      readonly code: "frame-missing";
      readonly isOk: false;
      readonly linkId: string;
    }
  | { readonly isOk: true; readonly links: readonly FlowLink[] };

const toFlowLink = (link: PrototypeLink): FlowLink | null => {
  if (!("frame" in link.to)) {
    return null;
  }

  if (link.trigger && link.trigger.kind !== "press") {
    return null;
  }

  const action = link.action ?? "navigate";

  if (action !== "navigate" && action !== "modal" && action !== "drawer") {
    return null;
  }

  return {
    action,
    fromFrame: link.from.frame,
    id: link.id,
    selector: link.from.selector,
    toFrame: link.to.frame,
  };
};

const toFlowLinks = (document: FlowLinksDocument): readonly FlowLink[] =>
  document.links.flatMap((link) => {
    const flow = toFlowLink(link);

    if (flow === null) {
      return [];
    }

    return [flow];
  });

const toStartFrameId = (
  frames: readonly FlowFrame[],
  document: FlowLinksDocument,
  requested: string | null
): string | null => {
  const known = new Set(frames.map((frame) => frame.id));

  if (requested !== null) {
    if (known.has(requested)) {
      return requested;
    }

    return null;
  }

  const { start } = document;

  if (start !== null && known.has(start)) {
    return start;
  }

  return frames[0]?.id ?? null;
};

const toCandidateLinks = (
  links: readonly FlowLink[],
  frameId: string,
  visited: ReadonlySet<string>
): readonly FlowLink[] =>
  links.filter(
    (link) => link.fromFrame === frameId && !visited.has(link.toFrame)
  );

const toExplicitPath = (
  links: readonly FlowLink[],
  frames: readonly FlowFrame[],
  linkIds: readonly string[]
): FlowPathResult => {
  const known = new Set(frames.map((frame) => frame.id));
  const picked: FlowLink[] = [];
  const byId = new Map(links.map((link) => [link.id, link]));

  for (const linkId of linkIds) {
    const found = byId.get(linkId) ?? null;

    if (found === null) {
      return { code: "link-missing", isOk: false, linkId };
    }

    if (!known.has(found.toFrame) || !known.has(found.fromFrame)) {
      return { code: "frame-missing", isOk: false, linkId };
    }

    const previous = picked.at(-1) ?? null;

    if (previous !== null && previous.toFrame !== found.fromFrame) {
      return { code: "link-broken", isOk: false, linkId };
    }

    picked.push(found);
  }

  return { isOk: true, links: picked };
};

const toStepAtMs = (index: number, stepMs: number): number => index * stepMs;

export {
  toCandidateLinks,
  toExplicitPath,
  toFlowLinks,
  toStartFrameId,
  toStepAtMs,
};

export type { FlowFrame, FlowLink, FlowLinksDocument, FlowPathResult };
