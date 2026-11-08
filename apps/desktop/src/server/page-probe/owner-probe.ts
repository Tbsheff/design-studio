import type { SourceLoc } from "@design-studio/contracts";
import type { ComponentOwner } from "@design-studio/contracts/props";

import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import { toOwnerProbeSource } from "../preview/probe-source/index.js";

interface ProbedElement {
  tag: string;
  owners: ComponentOwner[];
  usedAt: SourceLoc | null;
}

interface RawProbe {
  tag: string;
  owners: ComponentOwner[];
  usedAt: string | null;
}

const parseLoc = (raw: string | null): SourceLoc | null => {
  if (raw === null) {
    return null;
  }

  const match = /^(?<file>.+):(?<line>\d+):(?<column>\d+)$/u.exec(raw);

  if (match?.groups) {
    return {
      col: Number(match.groups.column),
      file: match.groups.file as string,
      line: Number(match.groups.line),
    };
  }

  return null;
};

const probeOwners = async (
  preview: PreviewService,
  url: string,
  selector: string
): Promise<ProbedElement | null> => {
  const raw = await probeOnPage<RawProbe | null>(
    preview,
    url,
    { height: 900, width: 1440 },
    toOwnerProbeSource(selector)
  );

  if (raw) {
    return { owners: raw.owners, tag: raw.tag, usedAt: parseLoc(raw.usedAt) };
  }

  return null;
};

export { probeOwners, parseLoc };

export type { ProbedElement };
