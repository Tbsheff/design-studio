import {
  PLAY_VIEWER,
  toBridgedHtml,
} from "@design-studio/actions/publish-remote";

import { fileOf } from "./db";
import type { FileRow } from "./db";
import { candidates, decodeRest } from "./paths";
import {
  FRAMES_PREFIX,
  hasPlayViewer,
  isViewerPath,
  STATUS_OK,
  toMissing,
  toMoved,
  toObject,
  toPageCache,
  toPlayFrameCsp,
  toSecured,
  toShellPath,
  toVersionId,
} from "./play-reply";
import type { PlayContext } from "./play-reply";

interface FoundFile {
  readonly file: FileRow;
  readonly path: string;
}

const INDEX_SUFFIX = "/index.html";

const HTML_ESCAPES = new Map([
  ['"', "&quot;"],
  ["&", "&amp;"],
  ["'", "&#39;"],
  ["<", "&lt;"],
  [">", "&gt;"],
]);

const HTML_SPECIAL = /["&'<>]/gu;

const toEscaped = (text: string): string =>
  text.replaceAll(HTML_SPECIAL, (special) => HTML_ESCAPES.get(special) ?? "");

const html = (
  parts: TemplateStringsArray,
  ...values: readonly string[]
): string =>
  parts
    .map((part, index) => `${toEscaped(values[index - 1] ?? "")}${part}`)
    .join("");

const toFirstFile = async (
  context: PlayContext,
  paths: readonly string[]
): Promise<FoundFile | null> => {
  const path = paths.at(0) ?? null;

  if (path === null) {
    return null;
  }

  const file = await fileOf(context.env.DB, toVersionId(context.pub), path);

  if (file !== null) {
    return { file, path };
  }

  return toFirstFile(context, paths.slice(1));
};

const isFolderMiss = (found: FoundFile, rest: string): boolean =>
  found.path.endsWith(INDEX_SUFFIX) && rest !== "" && !rest.endsWith("/");

const isHtml = (file: FileRow): boolean =>
  file.content_type.startsWith("text/html");

const toFrameBody = async (
  context: PlayContext,
  file: FileRow,
  object: R2ObjectBody
): Promise<BodyInit> => {
  if (!isHtml(file)) {
    return object.body;
  }

  const bridge = html`<script src="${toShellPath(context)}${PLAY_VIEWER.bridge}"></script>`;

  return toBridgedHtml(await object.text(), bridge);
};

const toFrameResponse = (
  context: PlayContext,
  file: FileRow,
  body: BodyInit
): Response => {
  const { origin } = new URL(context.request.url);

  const response = toSecured(
    context,
    new Response(body, {
      headers: {
        "cache-control": toPageCache(context.pub),
        "content-type": file.content_type,
      },
      status: STATUS_OK,
    }),
    toPlayFrameCsp(`${origin}${context.root}`)
  );

  response.headers.set("x-frame-options", "SAMEORIGIN");

  return response;
};

const serveFrame = async (
  context: PlayContext,
  raw: string
): Promise<Response> => {
  const rest = decodeRest(raw);

  if (isViewerPath(rest)) {
    return toMissing(context);
  }

  const found = await toFirstFile(context, candidates(rest));

  if (found === null) {
    return toMissing(context);
  }

  if (isFolderMiss(found, rest)) {
    return toMoved(context, `${toShellPath(context)}${FRAMES_PREFIX}${rest}/`);
  }

  const object = await toObject(context, found.file);

  if (object === null) {
    return toMissing(context);
  }

  const body = await toFrameBody(context, found.file, object);

  return toFrameResponse(context, found.file, body);
};

const serveViewerFrame = async (
  context: PlayContext,
  raw: string
): Promise<Response> => {
  if (!(await hasPlayViewer(context.env, context.pub))) {
    return toMissing(context);
  }

  return serveFrame(context, raw);
};

export { serveViewerFrame };
