import { PLAY_VIEWER } from "@design-studio/actions/publish-remote";

import { countView, fileOf } from "./db";
import type { FileRow } from "./db";
import { serveComments } from "./play-comments";
import { serveViewerFrame } from "./play-frame";
import {
  FRAMES_PREFIX,
  hasPlayViewer,
  isObject,
  isViewerPath,
  NO_STORE,
  PLAY_SHELL_CSP,
  ROUTE_PREFIX,
  STATUS_OK,
  toJson,
  toMissing,
  toMoved,
  toNotAllowed,
  toObject,
  toPageCache,
  toSecured,
  toShellPath,
  toVersionId,
  toViewerFile,
} from "./play-reply";
import type { PlayContext } from "./play-reply";

const ASSETS_PREFIX = `${PLAY_VIEWER.assets}/`;

const ASSET_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,200}$/u;

const ASSET_CACHE = "public, max-age=31536000, immutable";

const READ_METHODS = new Set(["GET", "HEAD"]);

const isPlayRoute = (rest: string): boolean =>
  rest === PLAY_VIEWER.route || rest.startsWith(ROUTE_PREFIX);

const toViewerObject = async (
  context: PlayContext,
  name: string
): Promise<{ file: FileRow; object: R2ObjectBody } | null> => {
  const file = await fileOf(
    context.env.DB,
    toVersionId(context.pub),
    toViewerFile(name)
  );

  if (file === null) {
    return null;
  }

  const object = await toObject(context, file);

  if (object === null) {
    return null;
  }

  return { file, object };
};

const isViewCounted = async (context: PlayContext): Promise<boolean> => {
  try {
    await countView(context.env.DB, context.pub.id);
  } catch {
    return false;
  }

  return true;
};

const countShellView = (context: PlayContext): void => {
  context.exec.waitUntil(isViewCounted(context));
};

const serveShell = async (context: PlayContext): Promise<Response> => {
  const found = await toViewerObject(context, PLAY_VIEWER.shell);

  if (found === null) {
    return toMissing(context);
  }

  countShellView(context);

  return toSecured(
    context,
    new Response(found.object.body, {
      headers: {
        "cache-control": NO_STORE,
        "content-type": found.file.content_type,
      },
      status: STATUS_OK,
    }),
    PLAY_SHELL_CSP
  );
};

const serveData = async (context: PlayContext): Promise<Response> => {
  const found = await toViewerObject(context, PLAY_VIEWER.data);

  if (found === null) {
    return toMissing(context);
  }

  const parsed: unknown = JSON.parse(await found.object.text());

  if (!isObject(parsed)) {
    return toMissing(context);
  }

  const data = {
    ...parsed,
    expiresAt: context.pub.expires_at ?? 0,
    isLive: false,
    title: context.pub.title,
  };

  return toJson(context, JSON.stringify(data), STATUS_OK);
};

const serveViewerFile = async (
  context: PlayContext,
  name: string,
  cache: string
): Promise<Response> => {
  const found = await toViewerObject(context, name);

  if (found === null) {
    return toMissing(context);
  }

  return toSecured(
    context,
    new Response(found.object.body, {
      headers: {
        "cache-control": cache,
        "content-type": found.file.content_type,
        etag: `"${found.file.sha256}"`,
      },
      status: STATUS_OK,
    }),
    PLAY_SHELL_CSP
  );
};

const serveAsset = (context: PlayContext, name: string): Promise<Response> => {
  if (!ASSET_NAME.test(name)) {
    return Promise.resolve(toMissing(context));
  }

  return serveViewerFile(context, `${PLAY_VIEWER.assets}/${name}`, ASSET_CACHE);
};

const serveRead = (context: PlayContext, inner: string): Promise<Response> => {
  if (inner === "") {
    return serveShell(context);
  }

  if (inner === PLAY_VIEWER.data) {
    return serveData(context);
  }

  if (inner === PLAY_VIEWER.bridge || inner === PLAY_VIEWER.favicon) {
    return serveViewerFile(context, inner, toPageCache(context.pub));
  }

  if (inner.startsWith(ASSETS_PREFIX)) {
    return serveAsset(context, inner.slice(ASSETS_PREFIX.length));
  }

  if (inner === PLAY_VIEWER.frames || inner.startsWith(FRAMES_PREFIX)) {
    return serveViewerFrame(context, inner.slice(FRAMES_PREFIX.length));
  }

  return Promise.resolve(toMissing(context));
};

const servePlay = (context: PlayContext, rest: string): Promise<Response> => {
  if (rest === PLAY_VIEWER.route) {
    return Promise.resolve(toMoved(context, toShellPath(context)));
  }

  const inner = rest.slice(ROUTE_PREFIX.length);

  if (inner === PLAY_VIEWER.comments) {
    return serveComments(context);
  }

  if (!READ_METHODS.has(context.request.method)) {
    return Promise.resolve(toNotAllowed(context, "GET, HEAD"));
  }

  return serveRead(context, inner);
};

export { hasPlayViewer, isPlayRoute, isViewerPath, servePlay, toMissing };

export type { PlayContext };
