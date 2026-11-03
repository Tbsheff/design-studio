import { onProbePage } from "../preview/probe-page.js";
import type { PreviewService } from "../types.js";
import { cutExpression } from "./mobile-cut.probe.js";

const MOBILE = { width: 390, height: 844 };

export interface CutElement {
  text: string;
  tag: string;
  source: string | null;
  usedAt: string | null;
  left: number;
  right: number;
}

export async function mobileCuts(
  preview: PreviewService,
  url: string
): Promise<CutElement[]> {
  return onProbePage(preview, url, MOBILE, (page) =>
    page.evaluate<CutElement[]>(cutExpression())
  );
}

export function cutLine(cut: CutElement): string {
  const side =
    cut.right > MOBILE.width
      ? `its right edge is at ${cut.right} px, past the ${MOBILE.width} px screen`
      : `its left edge is at ${cut.left} px, off the screen`;
  return `- [high] cut-at-390 on <${cut.tag}>${cut.text ? ` "${cut.text}"` : ""}${cut.usedAt || cut.source ? ` (${cut.usedAt || cut.source})` : ""}: at 390 px wide ${side}, so part of it is cut off. Fix: let it wrap or stack (flex-wrap, min-w-0, a column layout under sm:), or shorten it.`;
}
