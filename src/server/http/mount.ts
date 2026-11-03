import { Exit } from "effect";
import type { Context, Hono } from "hono";

import type { AnyAction } from "../../shared/actions/_core/action.js";
import type { StudioError } from "../../shared/actions/_core/errors/all.js";
import type { Entries } from "../handlers/_core/handler.js";
import { allowAll, makeRunner } from "../handlers/_core/run-action.js";
import type {
  Runner,
  WireArgs,
  WireForm,
} from "../handlers/_core/run-action.js";
import type { StudioRuntime } from "../main/runtime.js";
import { toLegacyPrincipal } from "../store/principal.js";
import { failureOf, toWireError } from "./wire-error.js";

type Group = Readonly<Record<string, AnyAction>>;

const BODYLESS = new Set(["DELETE", "GET"]);

const EMPTY: WireArgs = {};

const formOf = (ctx: Context): WireForm => {
  if (BODYLESS.has(ctx.req.method)) {
    return "query";
  }

  return "json";
};

const parseBody = (text: string): WireArgs => {
  try {
    const body: WireArgs = JSON.parse(text);

    return body;
  } catch {
    return EMPTY;
  }
};

const readBody = async (ctx: Context): Promise<WireArgs> => {
  const text = await ctx.req.text();

  if (text === "") {
    return EMPTY;
  }

  return parseBody(text);
};

const wireArgs = async (ctx: Context): Promise<WireArgs> => {
  const params = ctx.req.param();

  if (BODYLESS.has(ctx.req.method)) {
    return { ...ctx.req.query(), ...params };
  }

  return { ...(await readBody(ctx)), ...params };
};

const reply = (
  ctx: Context,
  exit: Exit.Exit<object, StudioError>
): Response => {
  if (Exit.isSuccess(exit)) {
    return ctx.json(exit.value);
  }

  const wire = toWireError(failureOf(exit));

  return ctx.json(wire.body, wire.status);
};

const mountOne = (
  app: Hono,
  action: AnyAction,
  run: Runner,
  runtime: StudioRuntime
): void => {
  app.on(action.http.method, action.http.path, async (ctx) => {
    const program = run(await wireArgs(ctx), toLegacyPrincipal(), formOf(ctx));

    const exit = await runtime.runPromiseExit(program, {
      signal: ctx.req.raw.signal,
    });

    return reply(ctx, exit);
  });
};

const mountActions = <Actions extends Group>(
  app: Hono,
  actions: Actions,
  entries: Entries<Actions>,
  runtime: StudioRuntime
): void => {
  for (const key of Object.keys(actions)) {
    const action = actions[key];
    const entry = entries[key];

    if (action && entry) {
      mountOne(app, action, makeRunner(action, entry, allowAll), runtime);
    }
  }
};

export { mountActions };
