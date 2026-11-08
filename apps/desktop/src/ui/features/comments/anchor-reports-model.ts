import { reviewReport } from "./comment-anchors.js";
import type { ReviewState } from "./comment-anchors.js";
import type { Rect } from "./comment-layer-model.js";
import type { CommentPatch } from "./comments-control.js";
import type { AnchorReport, DesignComment } from "./deps.js";

interface CommentPatchItem {
  readonly id: string;
  readonly patch: CommentPatch;
}

interface ReportOutcome {
  readonly isMissing: boolean;
  readonly patches: CommentPatchItem[];
  readonly rects: Map<string, Rect>;
}

const reviewReports = (
  comments: DesignComment[],
  reports: AnchorReport[],
  state: ReviewState
): ReportOutcome => {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const rects = new Map<string, Rect>();
  const patches: CommentPatchItem[] = [];
  let isMissing = false;

  for (const report of reports) {
    const comment = byId.get(report.id);

    if (comment) {
      if (report.rect) {
        rects.set(report.id, report.rect);
      }

      const review = reviewReport(comment, report, state);

      if (review.patch) {
        patches.push({ id: comment.id, patch: review.patch });
      }

      isMissing ||= review.missing;
    }
  }

  return { isMissing, patches, rects };
};

export { reviewReports };

export type { ReportOutcome };
