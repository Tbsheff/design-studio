import type { ApprovalCard } from "../../shared/actions/_core/approval-card.js";
import { publishExpiryText, publishSize } from "../../shared/publish.js";
import type { Publication, PublishPlan } from "../../shared/publish.js";

type PublishedVersion = Publication["versions"][number];

const PAGE_LIST_MAX = 4;

const TITLE_MAX = 80;

const WHAT_MAX = 220;

const SHORT_ID = 7;

const MINUTE_TEXT = 16;

const toOneLine = (text: string, max: number): string => {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length <= max) {
    return flat;
  }

  return `${flat.slice(0, max - 1)}…`;
};

const toCount = (count: number, word: string): string => {
  if (count === 1) {
    return `${count} ${word}`;
  }

  return `${count} ${word}s`;
};

const toPageList = (pages: readonly string[]): string => {
  if (pages.length <= PAGE_LIST_MAX) {
    return pages.join(", ");
  }

  return `${pages.slice(0, PAGE_LIST_MAX).join(", ")} and ${pages.length - PAGE_LIST_MAX} more`;
};

const toWhat = (plan: PublishPlan): string => {
  const pages = toPageList(plan.pages);

  if (plan.kind === "site") {
    return `${toCount(plan.pages.length, "page")} (${pages})`;
  }

  const shots = `PNG images of ${toCount(plan.pages.length, "frame")} (${pages})`;

  if (plan.comments) {
    return `${shots} and ${toCount(plan.comments, "comment")}`;
  }

  return shots;
};

const toOnOff = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "off";
};

const toIndexText = (plan: PublishPlan): string => {
  if (plan.noindex) {
    return "noindex";
  }

  return "Search engines may list it";
};

const toChangedText = (plan: PublishPlan): string => {
  if (plan.changedFiles === null) {
    return "";
  }

  return ` (${plan.changedFiles} changed)`;
};

const toTargetText = (plan: PublishPlan): string => {
  if (plan.backend === "local") {
    return " Target: local test server.";
  }

  return "";
};

const toPlanDetail = (plan: PublishPlan): string =>
  [
    `Anyone with the URL can open ${toOneLine(toWhat(plan), WHAT_MAX)}: ${toCount(plan.fileCount, "file")}${toChangedText(plan)}, ${publishSize(plan.bytes)}, at ${plan.url ?? plan.urlPattern}.`,
    `Password ${toOnOff(plan.password)}.`,
    `${publishExpiryText(plan.expiresAt)}.`,
    `Viewer comments ${toOnOff(plan.viewerComments)}.`,
    `${toIndexText(plan)}.`,
    `Version ${plan.versionId.slice(0, SHORT_ID)}.${toTargetText(plan)}`,
  ].join(" ");

const toPublishCard = (plan: PublishPlan): ApprovalCard => {
  const title = `Publish “${toOneLine(plan.title, TITLE_MAX)}” on a public URL`;

  if (plan.republishOf) {
    return {
      action: "Republish a design on the internet",
      detail: toPlanDetail(plan),
      title,
    };
  }

  return {
    action: "Publish a design on the internet",
    detail: toPlanDetail(plan),
    title,
  };
};

const toUnpublishDetail = (found: Publication): string => {
  const url = found.url ?? "Its URL";

  if (found.backend === "app") {
    return `${url} stops working at once (410) and its files are deleted from R2. View counts and comments stay.`;
  }

  return `This deletes the old Cloudflare Worker ${found.workerName ?? ""}. ${url} stops working at once.`;
};

const toUnpublishCard = (found: Publication): ApprovalCard => ({
  action: "Unpublish a design",
  detail: toUnpublishDetail(found),
  title: `Unpublish “${toOneLine(found.title, TITLE_MAX)}”`,
});

const toWhenText = (version: PublishedVersion): string => {
  if (version.committedAt === null) {
    return "an earlier time";
  }

  return new Date(version.committedAt)
    .toISOString()
    .slice(0, MINUTE_TEXT)
    .replace("T", " ");
};

const toRestoreCard = (
  found: Publication,
  version: PublishedVersion
): ApprovalCard => ({
  action: "Roll back a published design",
  detail: `${found.url ?? "Its URL"} goes back to the version published ${toWhenText(version)} (source version ${version.sourceVersion.slice(0, SHORT_ID)}, ${toCount(version.fileCount, "file")}). Anyone with the URL sees it at once.`,
  title: `Roll back “${toOneLine(found.title, TITLE_MAX)}”`,
});

export { toPlanDetail, toPublishCard, toRestoreCard, toUnpublishCard };
