import type { ApprovalCard } from "../../shared/actions/_core/approval-card.js";
import type { ShareServerState } from "../../shared/share.js";
import { expiryOf } from "./frames.js";
import { findLink, framesFor, loadTarget } from "./share-links.js";
import type { CreateRequest, ShareParts } from "./share-links.js";

const NAMES_MAX = 200;

const TITLE_MAX = 80;

const LAN_ON =
  "Allow on local network is ON, so other devices on your network can open it too.";

const LAN_OFF =
  "It serves on this computer only (127.0.0.1); local network access stays off.";

const LIVE_SEEN =
  "live PNG snapshots (new ones after each saved version, with their cursors on your canvas)";

const toOneLine = (text: string, max: number): string =>
  text.replaceAll(/\s+/gu, " ").trim().slice(0, max);

const toReach = (server: ShareServerState): string => {
  if (server.lan) {
    return LAN_ON;
  }

  return LAN_OFF;
};

const toSeen = (isLiveLink = false): string => {
  if (isLiveLink) {
    return LIVE_SEEN;
  }

  return "PNG snapshots";
};

const createCard = async (
  parts: ShareParts,
  input: CreateRequest
): Promise<ApprovalCard> => {
  const { direction, project } = await loadTarget(parts, input);

  const picked = await framesFor(
    parts.deps,
    project,
    direction,
    input.frames ?? []
  );

  const names =
    picked.frames.map((frame) => frame.name).join(", ") ||
    "every visible frame";

  const hours = expiryOf(input.expiresInHours);
  const seen = toSeen(input.live);
  const reach = toReach(parts.server.state());
  const title = toOneLine(input.title || project.name, TITLE_MAX);

  return {
    action: "Turn on a read-only share link",
    detail: `Anyone with the link can see ${seen} of ${toOneLine(names, NAMES_MAX)} and add comments for ${hours} h. ${reach} You can revoke it from Share.`,
    title: `Share “${title}” as a read-only link`,
  };
};

const revokeCard = async (
  parts: ShareParts,
  projectId: string,
  shareId: string
): Promise<ApprovalCard> => {
  const found = await findLink(parts, projectId, shareId);

  return {
    action: "Turn off a share link",
    detail:
      "The link, its images and its comment form stop working at once and the snapshot images are deleted. Comments already sent stay in the Comments pane.",
    title: `Revoke the share link “${toOneLine(found.title, TITLE_MAX)}”`,
  };
};

export { createCard, revokeCard };
