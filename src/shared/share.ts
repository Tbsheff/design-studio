import type { ExportFrame } from './export.js';

export const SHARE_EXPIRY_HOURS = [1, 24, 168] as const;
export type ShareExpiryHours = (typeof SHARE_EXPIRY_HOURS)[number];
export const SHARE_DEFAULT_EXPIRY_HOURS: ShareExpiryHours = 24;
export const SHARE_MAX_FRAMES = 12;
export const SHARE_NAME_MAX = 60;
export const SHARE_COMMENT_MAX = 1000;
export const SHARE_LIVE_VIEWERS_MAX = 10;

export interface ShareFrame {
  name: string;
  width: number;
  height: number;
  path?: string;
  cssHeight: number;
  id?: string;
}

export interface ShareLink {
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

export interface ShareServerState {
  running: boolean;
  lan: boolean;
  localUrl: string | null;
  lanUrl: string | null;
}

export interface ShareList {
  links: ShareLink[];
  server: ShareServerState;
}

export interface ShareCreateInput {
  directionId?: string;
  versionId?: string;
  frames?: ExportFrame[];
  expiresInHours?: ShareExpiryHours;
  title?: string;
  live?: boolean;
  frameIds?: (string | null)[];
}

export interface SharePresenceCursor {
  linkId: string;
  viewer: string;
  name: string;
  frameId: string | null;
  frame: number;
  x: number;
  y: number;
}

export type SharePresenceEvent =
  | { type: 'state'; cursors: SharePresenceCursor[]; wantCursor: boolean; live: number }
  | { type: 'cursor'; cursor: SharePresenceCursor }
  | { type: 'leave'; linkId: string; viewer: string }
  | { type: 'idle' };

export interface StudioCursorInput {
  frameId: string | null;
  x: number;
  y: number;
}

export interface ShareCreated {
  link: ShareLink;
  token: string;
  server: ShareServerState;
}

export function shareUrl(base: string, token: string): string {
  return `${base}/s/${token}`;
}
