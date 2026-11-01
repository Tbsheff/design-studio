import { Cause, Exit } from "effect";
import type { ManagedRuntime } from "effect";
import type { Context, Hono } from "hono";

import type { StudioError } from "../../shared/contract/_core/errors/all.js";
import { statusOf } from "../../shared/contract/_core/http-status.js";
import type { AnyOp } from "../../shared/contract/_core/op.js";
import { toWire } from "../../shared/contract/_core/wire.js";
import type { Entries } from "../services/_core/handler.js";
import { allowAll, makeRunner } from "../services/_core/run-op.js";
import type { Runner, WireArgs, WireForm } from "../services/_core/run-op.js";
import type { Principal } from "../store/local-principal.js";

interface StudioEnv {
  Variables: { principal: Principal };
}

type StudioApp = Hono<StudioEnv>;

type StudioRuntime = ManagedRuntime.ManagedRuntime<never, never>;

type Group = Readonly<Record<string, AnyOp>>;

const BODYLESS = new Set(["DELETE", "GET"]);

const EMPTY: WireArgs = {};

const formOf = (ctx: Context<StudioEnv>): WireForm => {
  if (BODYLESS.has(ctx.req.method)) {
    return "query";
  }

  return "json";
};

const readBody = async (ctx: Context<StudioEnv>): Promise<WireArgs> => {
  const text = await ctx.req.text();

  if (text === "") {
    return EMPTY;
  }

  try {
    const body: WireArgs = JSON.parse(text);

    return body;
  } catch {
    return EMPTY;
  }
};

const wireArgs = async (ctx: Context<StudioEnv>): Promise<WireArgs> => {
  const params = ctx.req.param();

  if (BODYLESS.has(ctx.req.method)) {
    return { ...ctx.req.query(), ...params };
  }

  return { ...(await readBody(ctx)), ...params };
};

const reply = (
  ctx: Context<StudioEnv>,
  exit: Exit.Exit<object, StudioError>
): Response => {
  if (Exit.isSuccess(exit)) {
    return ctx.json(exit.value);
  }

  const failure = exit.cause.reasons.find(Cause.isFailReason);

  if (!failure) {
    return ctx.json(toWire(null), statusOf("Defect"));
  }

  return ctx.json(toWire(failure.error), statusOf(failure.error._tag));
};

const mountOne = (
  app: StudioApp,
  op: AnyOp,
  run: Runner,
  runtime: StudioRuntime
): void => {
  app.on(op.http.method, op.http.path, async (ctx) => {
    const program = run(await wireArgs(ctx), ctx.get("principal"), formOf(ctx));

    const exit = await runtime.runPromiseExit(program, {
      signal: ctx.req.raw.signal,
    });

    return reply(ctx, exit);
  });
};

const mountOps = <Ops extends Group>(
  app: StudioApp,
  ops: Ops,
  entries: Entries<Ops>,
  runtime: StudioRuntime
): void => {
  for (const key of Object.keys(ops)) {
    const op = ops[key];
    const entry = entries[key];

    if (op && entry) {
      mountOne(app, op, makeRunner(op, entry, allowAll), runtime);
    }
  }
};

export { mountOps };

export type { StudioApp, StudioEnv };
