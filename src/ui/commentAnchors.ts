import {
  canOrphan,
  formatLoc,
  matchesFrame,
  type OrphanTracker,
} from "../shared/comments";
import type {
  AnchorReport,
  DesignComment,
  SourceLoc,
} from "../shared/contracts";
import type { CommentPatch } from "./useComments";

interface ReportReview {
  patch: CommentPatch | null;
  missing: boolean;
}

export interface ReviewState {
  orphans: OrphanTracker;
  retargeted: Map<string, string>;
  now: number;
}

export interface ActiveFrame {
  id: string;
  path: string;
  ids: string[];
}

function onPage(comment: Pick<DesignComment, "frame">, path: string): boolean {
  const frame = comment.frame;

  return matchesFrame(frame ? { frame: { path: frame.path } } : {}, "", {
    path,
  });
}

export function onActiveFrame(
  comment: Pick<DesignComment, "frame" | "drawing">,
  active: ActiveFrame
): boolean {
  const id = comment.frame?.id;

  if (comment.drawing && id && active.ids.includes(id)) {
    return id === active.id;
  }

  return onPage(comment, active.path);
}

export function pageShown(
  comment: Pick<DesignComment, "frame" | "drawing">,
  paths: readonly string[] | null
): boolean {
  if (paths === null || comment.drawing || !comment.frame) {
    return true;
  }

  return paths.some((path) => onPage(comment, path));
}

export function commentPageName(comment: Pick<DesignComment, "frame">): string {
  const path = (comment.frame?.path ?? "").replace(/^\/+/, "");

  if (path === "" || /\.html?$/i.test(path)) {
    return path.replace(/^.*\//, "").replace(/\.html?$/i, "") || "index";
  }

  return `/${path}`;
}

export function parseLoc(value: string | null | undefined): SourceLoc | null {
  if (!value) {
    return null;
  }

  const match = /^(.*):(\d+):(\d+)$/.exec(value);

  if (!match || !match[1]) {
    return null;
  }

  return { file: match[1], line: Number(match[2]), col: Number(match[3]) };
}

function movedTarget(
  comment: DesignComment,
  report: AnchorReport
): CommentPatch["target"] {
  return {
    ...comment.target,
    selector: report.selector ?? comment.target.selector,
    sourceLoc: parseLoc(report.sourceLoc) ?? comment.target.sourceLoc,
    ...(report.rect ? { rectHint: report.rect } : {}),
  };
}

function needsRetarget(comment: DesignComment, report: AnchorReport): boolean {
  if (report.via === null || report.via === "source") {
    return false;
  }

  if (comment.status !== "queued" && comment.status !== "draft") {
    return false;
  }

  const movedSource =
    Boolean(report.sourceLoc) &&
    report.sourceLoc !== formatLoc(comment.target.sourceLoc);

  return report.selector !== comment.target.selector || movedSource;
}

function retargetPatch(
  comment: DesignComment,
  report: AnchorReport,
  state: ReviewState
): CommentPatch | null {
  if (!report.rect || !needsRetarget(comment, report)) {
    return null;
  }

  const signature = `${report.selector}|${report.sourceLoc}`;

  if (state.retargeted.get(comment.id) === signature) {
    return null;
  }

  state.retargeted.set(comment.id, signature);

  return { target: movedTarget(comment, report) };
}

export function reviewReport(
  comment: DesignComment,
  report: AnchorReport,
  state: ReviewState
): ReportReview {
  if (report.rect && comment.status === "orphaned") {
    return {
      patch: { status: "queued", target: movedTarget(comment, report) },
      missing: false,
    };
  }

  const retarget = retargetPatch(comment, report, state);

  if (!canOrphan(comment.status)) {
    return { patch: retarget, missing: false };
  }

  if (!state.orphans.observe(comment.id, report.rect !== null, state.now)) {
    return { patch: retarget, missing: report.rect === null };
  }

  state.orphans.forget(comment.id);

  return { patch: { status: "orphaned" }, missing: false };
}
