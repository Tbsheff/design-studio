import { PLAY_VIEWER } from "@design-studio/actions/publish-remote";

import { blobKey, fileOf } from "./db";
import type { FileRow, PublicationRow } from "./db";
import { designCsp, PAGE_CSP, secure } from "./http";
import type { Env } from "./http";
import { messagePage } from "./pages";

const PLAY_SHELL_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

const FRAME_DENY = "frame-ancestors 'none'";

const SANDBOX_TAIL = /; sandbox [^;]*$/u;

const JSON_TYPE = "application/json; charset=utf-8";

interface PlayContext {
  readonly env: Env;
  readonly exec: ExecutionContext;
  readonly pub: PublicationRow;
  readonly request: Request;
  readonly root: string;
}

const ROUTE_PREFIX = `${PLAY_VIEWER.route}/`;

const FRAMES_PREFIX = `${PLAY_VIEWER.frames}/`;

const VIEWER_PREFIX = `${PLAY_VIEWER.dir}/`;

const NO_STORE = "no-store";

const STATUS_OK = 200;

const STATUS_BAD = 400;

const STATUS_FORBIDDEN = 403;

const STATUS_NOT_FOUND = 404;

const STATUS_NOT_ALLOWED = 405;

const STATUS_MOVED = 301;

const STATUS_TOO_LARGE = 413;

const isViewerPath = (path: string): boolean => path.startsWith(VIEWER_PREFIX);

const toViewerFile = (name: string): string => `${VIEWER_PREFIX}${name}`;

const toVersionId = (pub: PublicationRow): string => pub.current_version ?? "";

const isNoindex = (pub: PublicationRow): boolean => pub.noindex === 1;

const toPageCache = (pub: PublicationRow): string => {
  if (pub.password_hash !== null) {
    return "private, no-store";
  }

  return "public, max-age=60, must-revalidate";
};

const toShellPath = (context: PlayContext): string =>
  `${context.root}${ROUTE_PREFIX}`;

const toSecured = (
  context: PlayContext,
  response: Response,
  csp: string
): Response => secure(response, { csp, noindex: isNoindex(context.pub) });

const toMissing = (context: PlayContext): Response =>
  toSecured(
    context,
    messagePage(
      STATUS_NOT_FOUND,
      "Page not found",
      "This page is not part of the published design."
    ),
    PAGE_CSP
  );

const toNotAllowed = (context: PlayContext, allow: string): Response =>
  toSecured(
    context,
    new Response("Method not allowed", {
      headers: { allow },
      status: STATUS_NOT_ALLOWED,
    }),
    PAGE_CSP
  );

const toMoved = (context: PlayContext, location: string): Response =>
  toSecured(
    context,
    new Response(null, { headers: { location }, status: STATUS_MOVED }),
    PAGE_CSP
  );

const toJson = (context: PlayContext, text: string, status: number): Response =>
  toSecured(
    context,
    new Response(text, {
      headers: { "cache-control": NO_STORE, "content-type": JSON_TYPE },
      status,
    }),
    PLAY_SHELL_CSP
  );

const toPlayFrameCsp = (self: string): string =>
  designCsp("site", self)
    .replace(FRAME_DENY, "frame-ancestors 'self'")
    .replace(SANDBOX_TAIL, "");

const isObject = (value: unknown): value is object =>
  value instanceof Object && !Array.isArray(value);

const hasPlayViewer = async (
  env: Env,
  pub: PublicationRow
): Promise<boolean> => {
  if (pub.current_version === null) {
    return false;
  }

  const shell = await fileOf(
    env.DB,
    pub.current_version,
    toViewerFile(PLAY_VIEWER.shell)
  );

  return shell !== null;
};

const toObject = (
  context: PlayContext,
  file: FileRow
): Promise<R2ObjectBody | null> =>
  context.env.FILES.get(blobKey(context.pub.id, file.sha256));

export {
  PLAY_SHELL_CSP,
  toPlayFrameCsp,
  FRAMES_PREFIX,
  hasPlayViewer,
  isNoindex,
  isObject,
  isViewerPath,
  NO_STORE,
  ROUTE_PREFIX,
  STATUS_BAD,
  STATUS_FORBIDDEN,
  STATUS_OK,
  STATUS_TOO_LARGE,
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
};

export type { PlayContext };
