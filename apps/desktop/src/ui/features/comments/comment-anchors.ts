import { canOrphan, formatLoc, matchesFrame } from "./deps.js";
import type {
  AnchorReport,
  DesignComment,
  OrphanTracker,
  SourceLoc,
} from "./deps.js";
import type { CommentPatch } from "./use-comments.js";

const LINE_GROUP = 2;
const COL_GROUP = 3;

interface ReportReview {
  patch: CommentPatch | null;
  missing: boolean;
}

interface ReviewState {
  orphans: OrphanTracker;
  retargeted: Map<string, string>;
  now: number;
}

interface ActiveFrame {
  id: string;
  path: string;
  ids: string[];
}

const onPage = (
  comment: Pick<DesignComment, "frame">,
  path: string
): boolean => {
  const { frame } = comment;

  return matchesFrame((frame && { frame: { path: frame.path } }) || {}, "", {
    path,
  });
};

const onActiveFrame = (
  comment: Pick<DesignComment, "frame" | "drawing">,
  active: ActiveFrame
): boolean => {
  const id = comment.frame?.id;

  if (comment.drawing && id && active.ids.includes(id)) {
    return id === active.id;
  }

  return onPage(comment, active.path);
};

const pageShown = (
  comment: Pick<DesignComment, "frame" | "drawing">,
  paths: readonly string[] | null
): boolean => {
  if (paths === null || comment.drawing || !comment.frame) {
    return true;
  }

  return paths.some((path) => onPage(comment, path));
};

const commentPageName = (comment: Pick<DesignComment, "frame">): string => {
  const path = (comment.frame?.path ?? "").replace(/^\/+/u, "");

  if (path === "" || /\.html?$/iu.test(path)) {
    return path.replace(/^.*\//u, "").replace(/\.html?$/iu, "") || "index";
  }

  return `/${path}`;
};

const parseLoc = (value: string | null | undefined): SourceLoc | null => {
  if (!value) {
    return null;
  }

  const match = /^(.*):(\d+):(\d+)$/u.exec(value);

  if (!match || !match[1]) {
    return null;
  }

  return {
    col: Number(match[COL_GROUP]),
    file: match[1],
    line: Number(match[LINE_GROUP]),
  };
};

const movedTarget = (
  comment: DesignComment,
  report: AnchorReport
): CommentPatch["target"] => ({
  ...comment.target,
  selector: report.selector ?? comment.target.selector,
  sourceLoc: parseLoc(report.sourceLoc) ?? comment.target.sourceLoc,
  ...(report.rect ? { rectHint: report.rect } : {}),
});

const needsRetarget = (
  comment: DesignComment,
  report: AnchorReport
): boolean => {
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
};

const retargetPatch = (
  comment: DesignComment,
  report: AnchorReport,
  state: ReviewState
): CommentPatch | null => {
  if (!report.rect || !needsRetarget(comment, report)) {
    return null;
  }

  const signature = `${report.selector}|${report.sourceLoc}`;

  if (state.retargeted.get(comment.id) === signature) {
    return null;
  }

  state.retargeted.set(comment.id, signature);

  return { target: movedTarget(comment, report) };
};

const reviewReport = (
  comment: DesignComment,
  report: AnchorReport,
  state: ReviewState
): ReportReview => {
  if (report.rect && comment.status === "orphaned") {
    return {
      missing: false,
      patch: { status: "queued", target: movedTarget(comment, report) },
    };
  }

  const retarget = retargetPatch(comment, report, state);

  if (!canOrphan(comment.status)) {
    return { missing: false, patch: retarget };
  }

  if (!state.orphans.observe(comment.id, report.rect !== null, state.now)) {
    return { missing: report.rect === null, patch: retarget };
  }

  state.orphans.forget(comment.id);

  return { missing: false, patch: { status: "orphaned" } };
};

export { onActiveFrame, pageShown, commentPageName, parseLoc, reviewReport };

export type { ReviewState, ActiveFrame };
