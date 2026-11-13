import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  NOT_FOUND,
  OK,
} from "@design-studio/actions/_core/errors/http-status-codes";
import { BRIDGE_SCRIPT_PATH } from "@design-studio/contracts";
import { Hono } from "hono";
import type { Context, Next } from "hono";

import { loadBridgeScript } from "../preview/frame-files/index.js";
import { toPlayData } from "./play-data.js";
import { toServedFile } from "./play-files.js";
import { createPlayTargets } from "./play-target.js";
import type { PlayAppDeps, PlayTarget, PlayTargets } from "./play-target.js";

const SHARED_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};

const SHELL_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const SHELL_HEADERS = {
  ...SHARED_HEADERS,
  "content-security-policy": SHELL_CSP,
  "content-type": "text/html; charset=utf-8",
  "cross-origin-opener-policy": "same-origin",
  "x-frame-options": "DENY",
};

const FRAME_HEADERS = {
  ...SHARED_HEADERS,
  "content-security-policy": "frame-ancestors 'self'",
  "x-frame-options": "SAMEORIGIN",
};

const ASSET_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

const ASSET_CACHE = "public, max-age=31536000, immutable";

const SCRIPT_TYPE = "text/javascript; charset=utf-8";

const ENDED_TEXT = "This link does not exist, has ended, or was turned off.";

const toNotFound = (context: Context): Response =>
  context.text(ENDED_TEXT, NOT_FOUND, SHARED_HEADERS);

const toToken = (context: Context): string => context.req.param("token") ?? "";

const toShellReply = async (
  targets: PlayTargets,
  context: Context,
  passOn: Next
): Promise<Response> => {
  const [target, parts] = await Promise.all([
    targets.toTarget(toToken(context)),
    targets.toShell(),
  ]);

  if (target === null || parts === null) {
    await passOn();

    return context.res;
  }

  return context.body(parts.html, OK, SHELL_HEADERS);
};

const toDataReply = async (
  targets: PlayTargets,
  context: Context
): Promise<Response> => {
  const target = await targets.toTarget(toToken(context));

  if (target === null) {
    return toNotFound(context);
  }

  const data = await toPlayData(
    targets.dataDeps,
    target.project,
    target.record
  );

  return context.json(data, OK, SHARED_HEADERS);
};

const toFramePath = (context: Context, token: string): string =>
  context.req.path.slice(`/s/${token}/p`.length);

const toFrameReply = async (
  targets: PlayTargets,
  context: Context
): Promise<Response> => {
  const token = toToken(context);
  const target: PlayTarget | null = await targets.toTarget(token);

  if (target === null) {
    return toNotFound(context);
  }

  const root = await targets.toRoot(target);
  const served = await toServedFile(root, toFramePath(context, token));

  if (served === null) {
    return toNotFound(context);
  }

  return context.body(served.body, OK, {
    ...FRAME_HEADERS,
    "content-type": served.contentType,
  });
};

const toAssetReply = async (
  targets: PlayTargets,
  context: Context
): Promise<Response> => {
  const name = context.req.param("file") ?? "";
  const parts = await targets.toShell();
  const type = ASSET_TYPES.get(path.extname(name)) ?? null;

  if (parts === null || type === null || !parts.assets.has(name)) {
    return toNotFound(context);
  }

  const bytes = await readFile(path.join(targets.uiDir, "assets", name));

  return context.body(new Uint8Array(bytes), OK, {
    ...SHARED_HEADERS,
    "cache-control": ASSET_CACHE,
    "content-type": type,
  });
};

const toBridgeReply = async (context: Context): Promise<Response> =>
  context.body(await loadBridgeScript(), OK, {
    ...SHARED_HEADERS,
    "content-type": SCRIPT_TYPE,
  });

const createPlayApp = (deps: PlayAppDeps): Hono => {
  const app = new Hono();
  const targets = createPlayTargets(deps);

  app.get("/s/:token", (context, passOn) =>
    toShellReply(targets, context, passOn)
  );
  app.get("/s/:token/play.json", (context) => toDataReply(targets, context));
  app.get("/s/:token/p", (context) => toFrameReply(targets, context));
  app.get("/s/:token/p/*", (context) => toFrameReply(targets, context));
  app.get("/assets/:file", (context) => toAssetReply(targets, context));
  app.get(BRIDGE_SCRIPT_PATH, toBridgeReply);

  return app;
};

const toShareApp = (viewer: Hono, deps: PlayAppDeps): Hono => {
  const root = new Hono();

  root.route("/", createPlayApp(deps));
  root.route("/", viewer);

  return root;
};

export { toShareApp };

export type { PlayAppDeps };
