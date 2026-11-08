import { copy } from "./copy.js";
import type { RouteOutput, critiqueRoutes } from "./deps.js";

type AttentionView = RouteOutput<typeof critiqueRoutes.runAttentionCritique>;

type AttentionElementView = AttentionView["topElements"][number];

type AttentionNoteView = AttentionView["notes"][number];

const CHECKS_MARK = "checks/";

const PERCENT = 100;

const toHeatmapFilePath = (absolute: string): string => {
  const at = absolute.lastIndexOf(CHECKS_MARK);

  if (at === -1) {
    return absolute;
  }

  return absolute.slice(at);
};

const toShareLabel = (share: number): string =>
  `${Math.round(share * PERCENT)}%`;

const toAttentionRunLabel = (isBusy: boolean, hasResult: boolean): string => {
  if (isBusy) {
    return copy.attention.running;
  }

  if (hasResult) {
    return copy.attention.rerun;
  }

  return copy.attention.run;
};

const toAttentionKey = (view: AttentionView): string =>
  `${view.clarityScore}|${view.topElements.map((item) => item.share).join(",")}`;

export { toAttentionKey, toAttentionRunLabel, toHeatmapFilePath, toShareLabel };

export type { AttentionElementView, AttentionNoteView, AttentionView };
