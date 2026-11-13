import type { LinksFile, PrototypeLink } from "@design-studio/contracts/links";

type ShareSpot = Readonly<Record<"x" | "y", number | null>>;

interface SharePlayFrame {
  readonly height: number;
  readonly id: string;
  readonly index: number;
  readonly label: string | null;
  readonly path: string | null;
  readonly width: number;
  readonly left: number;
  readonly top: number;
}

interface SharePlayData {
  readonly expiresAt: number;
  readonly frames: readonly SharePlayFrame[];
  readonly implicit: readonly PrototypeLink[];
  readonly isLive: boolean;
  readonly links: LinksFile;
  readonly rev: number;
  readonly title: string;
}

type ShareCommentNumber = Readonly<Record<"n", number>>;

interface ShareViewerComment extends ShareSpot, ShareCommentNumber {
  readonly author: string;
  readonly createdAt: number;
  readonly frame: number;
  readonly text: string;
}

interface ShareCommentDraft extends ShareSpot {
  readonly frame: number;
  readonly name: string;
  readonly text: string;
}

const SHARE_PLAY_DATA_PATH = "/play.json";

const SHARE_PLAY_FILES_PATH = "/p/";

export { SHARE_PLAY_DATA_PATH, SHARE_PLAY_FILES_PATH };

export type {
  ShareCommentDraft,
  SharePlayData,
  SharePlayFrame,
  ShareSpot,
  ShareViewerComment,
};
