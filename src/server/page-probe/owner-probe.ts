import type { SourceLoc } from "../../shared/contracts.js";
import type { ComponentOwner } from "../../shared/props.js";
import type { PreviewService } from "../preview/index.js";
import { probeOnPage } from "../preview/probe-page.js";
import { probe } from "./owner-probe.probe.js";

export interface ProbedElement {
  tag: string;
  owners: ComponentOwner[];
  usedAt: SourceLoc | null;
}

interface RawProbe {
  tag: string;
  owners: ComponentOwner[];
  usedAt: string | null;
}

export async function probeOwners(
  preview: PreviewService,
  url: string,
  selector: string
): Promise<ProbedElement | null> {
  const raw = await probeOnPage<RawProbe | null>(
    preview,
    url,
    { width: 1440, height: 900 },
    probe(selector)
  );
  return raw
    ? { tag: raw.tag, owners: raw.owners, usedAt: parseLoc(raw.usedAt) }
    : null;
}

export function parseLoc(raw: string | null): SourceLoc | null {
  const match = raw ? /^(.+):(\d+):(\d+)$/.exec(raw) : null;
  return match
    ? {
        file: match[1] as string,
        line: Number(match[2]),
        col: Number(match[3]),
      }
    : null;
}

export { appSourceBody, ownerWalk } from "./owner-probe.probe.js";
