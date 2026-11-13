import { timingSafeEqual } from "node:crypto";

import type { Context } from "hono";
import { getCookie } from "hono/cookie";

import type { ServerConfig } from "../platform/config/index.js";

const UI_SECRET_HEADER = "x-studio-ui-secret";

const UI_COOKIE = "studio_ui";

const isStudioHost = (host: string | null, port: number): boolean =>
  host === `127.0.0.1:${port}` || host === `localhost:${port}`;

const isSecretEqual = (
  given: string | null,
  secret: string | null
): boolean => {
  if (given === null || secret === null || secret === "") {
    return false;
  }

  const givenBytes = Buffer.from(given);
  const secretBytes = Buffer.from(secret);

  if (givenBytes.length !== secretBytes.length) {
    return false;
  }

  return timingSafeEqual(givenBytes, secretBytes);
};

const isStudioHostRequest = (context: Context, config: ServerConfig): boolean =>
  isStudioHost(context.req.header("host") ?? null, config.studioPort);

const isTrustedUi = (context: Context, config: ServerConfig): boolean => {
  if (!isStudioHostRequest(context, config)) {
    return false;
  }

  return (
    isSecretEqual(
      context.req.header(UI_SECRET_HEADER) ?? null,
      config.uiSecret
    ) || isSecretEqual(getCookie(context, UI_COOKIE) ?? null, config.uiSecret)
  );
};

export {
  UI_COOKIE,
  UI_SECRET_HEADER,
  isSecretEqual,
  isStudioHostRequest,
  isTrustedUi,
};
