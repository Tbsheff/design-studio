import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { FORBIDDEN } from "@design-studio/actions/_core/errors/http-status-codes";
import { toWire } from "@design-studio/actions/_core/wire";
import type { Context, Hono } from "hono";
import { setCookie } from "hono/cookie";

import type { ServerConfig } from "../platform/config/index.js";
import type { AppContext } from "./app-context.js";
import {
  UI_COOKIE,
  isSecretEqual,
  isStudioHostRequest,
  isTrustedUi,
} from "./ui-trust.js";

const REDIRECT_FOUND = 302;

const FORBIDDEN_BODY = toWire(
  new Forbidden({
    message: "Only the Design Studio app can read this session.",
    perm: "session",
  })
);

const isCrossSiteFetch = (context: Context): boolean => {
  const site = context.req.header("sec-fetch-site") ?? null;

  return site !== null && site !== "same-origin";
};

const isOpenAllowed = (context: Context, config: ServerConfig): boolean =>
  isStudioHostRequest(context, config) &&
  isSecretEqual(context.req.query("key") ?? null, config.uiSecret);

const registerSessionRoutes = (app: Hono, ctx: AppContext): void => {
  const { config } = ctx;

  app.get("/api/session/open", (context) => {
    if (!isOpenAllowed(context, config) || config.uiSecret === null) {
      return context.json(FORBIDDEN_BODY, FORBIDDEN);
    }

    setCookie(context, UI_COOKIE, config.uiSecret, {
      httpOnly: true,
      path: "/",
      sameSite: "Strict",
    });

    return context.redirect("/", REDIRECT_FOUND);
  });

  app.get("/api/session", (context) => {
    if (isCrossSiteFetch(context) || !isTrustedUi(context, config)) {
      return context.json(FORBIDDEN_BODY, FORBIDDEN);
    }

    return context.json({
      previewOrigin: config.previewOrigin,
      token: config.studioToken,
    });
  });
};

export { registerSessionRoutes };
