import { publishExpiryText, publishSize } from "../../../shared/publish.js";
import type { PublishPlan } from "../../../shared/publish.js";
import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

const SHORT_VERSION = 7;

interface PlanRow {
  readonly label: string;
  readonly value: string;
  readonly isMono: boolean;
}

const toPlural = (count: number, noun: string, plural: string): string =>
  pick(count === 1, noun, plural);

const toFilesText = (plan: PublishPlan): string => {
  const noun = toPlural(plan.fileCount, copy.fileWord, copy.filesPlural);
  const base = `${plan.fileCount} ${noun}, ${publishSize(plan.bytes)}`;

  if (plan.changedFiles === null) {
    return base;
  }

  return `${base} (${plan.changedFiles} ${copy.changedSinceLive})`;
};

const toIndexText = (plan: PublishPlan): string =>
  pick(plan.noindex, copy.noindexWord, copy.searchEnginesMayList);

const toNotesText = (plan: PublishPlan): string => {
  if (plan.comments <= 0) {
    return copy.noneWord;
  }

  const noun = toPlural(
    plan.comments,
    copy.openCommentWord,
    copy.openCommentsWord
  );

  return `${plan.comments} ${noun}`;
};

const toPlanRows = (plan: PublishPlan): PlanRow[] => {
  const rows: PlanRow[] = [
    {
      isMono: true,
      label: copy.addressWord,
      value: plan.url ?? plan.urlPattern,
    },
    {
      isMono: false,
      label: pick(plan.kind === "site", copy.pagesWord, copy.framesWord),
      value: plan.pages.join(", "),
    },
    { isMono: false, label: copy.filesWord, value: toFilesText(plan) },
    {
      isMono: false,
      label: copy.passwordWord,
      value: pick(plan.password, copy.onWord, copy.offAnyoneWithUrl),
    },
    {
      isMono: false,
      label: copy.endsWord,
      value: publishExpiryText(plan.expiresAt),
    },
    {
      isMono: false,
      label: copy.commentsWord,
      value: pick(plan.viewerComments, copy.viewersCanComment, copy.offWord),
    },
    { isMono: false, label: copy.indexingWord, value: toIndexText(plan) },
    {
      isMono: false,
      label: copy.versionWord,
      value: plan.versionId.slice(0, SHORT_VERSION),
    },
  ];

  if (plan.kind === "viewer") {
    rows.push({
      isMono: false,
      label: copy.studioNotes,
      value: toNotesText(plan),
    });
  }

  return rows;
};

export { toPlanRows };

export type { PlanRow };
