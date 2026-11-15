import type { ExportFrame } from "@design-studio/contracts/export";

const HOUR_DAY = 24;

const HOUR_WEEK = 168;

const SHARE_EXPIRY_HOURS = [1, HOUR_DAY, HOUR_WEEK] as const;

type ShareExpiryHours = (typeof SHARE_EXPIRY_HOURS)[number];

const SHARE_DEFAULT_EXPIRY_HOURS: ShareExpiryHours = 24;
const SHARE_MAX_FRAMES = 12;
const SHARE_NAME_MAX = 60;
const SHARE_COMMENT_MAX = 1000;
const SHARE_LIVE_VIEWERS_MAX = 10;

interface ShareFrame {
  name: string;
  width: number;
  height: number;
  path?: string;
  cssHeight: number;
  id?: string;
}

interface ShareLink {
  id: string;
  projectId: string;
  directionId: string;
  versionId: string;
  title: string;
  frames: ShareFrame[];
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  comments: number;
  active: boolean;
  live: boolean;
  studioCursor: boolean;
  rev: number;
  viewers: number;
}

interface ShareServerState {
  running: boolean;
  lan: boolean;
  localUrl: string | null;
  lanUrl: string | null;
}

interface ShareList {
  links: ShareLink[];
  server: ShareServerState;
}

interface ShareCreateInput {
  directionId?: string;
  versionId?: string;
  frames?: ExportFrame[];
  expiresInHours?: ShareExpiryHours;
  title?: string;
  live?: boolean;
  frameIds?: (string | null)[];
}

interface SharePresenceCursor {
  linkId: string;
  viewer: string;
  name: string;
  frameId: string | null;
  frame: number;
  x: number;
  y: number;
}

type SharePresenceEvent =
  | {
      type: "state";
      cursors: SharePresenceCursor[];
      wantCursor: boolean;
      live: number;
    }
  | { type: "cursor"; cursor: SharePresenceCursor }
  | { type: "leave"; linkId: string; viewer: string }
  | { type: "idle" };

interface StudioCursorInput {
  frameId: string | null;
  x: number;
  y: number;
}

interface ShareCreated {
  link: ShareLink;
  token: string;
  server: ShareServerState;
}

const shareUrl = (base: string, token: string): string => `${base}/s/${token}`;

const SHARE_FRAME_HASH_KEY = "frame";

const FRAME_NUMBER = /^[1-9][0-9]{0,3}$/u;

const toShareFrameKey = (
  frame: Pick<ShareFrame, "id">,
  index: number
): string => frame.id ?? String(index + 1);

const toShareFrameHashUrl = (url: string, frameKey: string): string =>
  `${url}#${SHARE_FRAME_HASH_KEY}=${encodeURIComponent(frameKey)}`;

const toShareFrameUrl = (
  base: string,
  token: string,
  frameKey: string
): string => toShareFrameHashUrl(shareUrl(base, token), frameKey);

const toShareFrameIndex = (
  frameIds: readonly string[],
  frameKey: string | null
): number => {
  if (frameKey === null) {
    return -1;
  }

  const byId = frameIds.indexOf(frameKey);

  if (byId !== -1 || !FRAME_NUMBER.test(frameKey)) {
    return byId;
  }

  const index = Number(frameKey) - 1;

  if (index < frameIds.length) {
    return index;
  }

  return -1;
};

export {
  SHARE_COMMENT_MAX,
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_EXPIRY_HOURS,
  SHARE_FRAME_HASH_KEY,
  SHARE_LIVE_VIEWERS_MAX,
  SHARE_MAX_FRAMES,
  SHARE_NAME_MAX,
  shareUrl,
  toShareFrameHashUrl,
  toShareFrameIndex,
  toShareFrameKey,
  toShareFrameUrl,
};

export type {
  ShareCreated,
  ShareCreateInput,
  ShareExpiryHours,
  ShareFrame,
  ShareLink,
  ShareList,
  SharePresenceCursor,
  SharePresenceEvent,
  ShareServerState,
  StudioCursorInput,
};
