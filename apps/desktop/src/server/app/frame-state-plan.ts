import type http from "node:http";

import type { MockRule } from "@design-studio/contracts/frame-state";

import {
  isBatchCall,
  isRule,
  toEnvelope,
  toProcedureRules,
  toProcedures,
  toTrpcError,
} from "./frame-state-calls.js";
import type { CallPlan } from "./frame-state-calls.js";
import type { ActiveFrameState } from "./frame-state-proxy.js";
import { toTrialRecorder } from "./frame-state-trial.js";
import type { RecordedBody } from "./frame-state-trial.js";

const FAILED_STATUS = 400;

const OK_STATUS = 200;

const SERVER_ERROR_STATUS = 500;

const ERROR_MESSAGE = "Design Studio error state: this call failed on purpose.";

const toPathname = (req: http.IncomingMessage): string =>
  (req.url ?? "/").split("?")[0] ?? "/";

const isDataPath = (pathname: string): boolean => {
  if (pathname.startsWith("/api/auth/") || pathname === "/api/auth") {
    return false;
  }

  return (
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.includes("/trpc/") ||
    pathname.endsWith("/trpc")
  );
};

const isJsonlCall = (req: http.IncomingMessage): boolean =>
  String(req.headers["trpc-accept"] ?? "").includes("jsonl");

const toErrorBody = (req: http.IncomingMessage): RecordedBody => {
  const procedures = toProcedures(toPathname(req));

  if (procedures === null) {
    return { error: ERROR_MESSAGE, message: ERROR_MESSAGE };
  }

  const errors = procedures.map((procedure) => toTrpcError(procedure));

  if (isBatchCall(req.url ?? "", procedures.length)) {
    return errors;
  }

  return errors[0] ?? null;
};

const applyJsonReply = (
  res: http.ServerResponse,
  status: number,
  body: RecordedBody,
  delayMs: number | null
): void => {
  const reply = (): void => {
    res.writeHead(status, {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-studio-mock": "1",
    });
    res.end(JSON.stringify(body));
  };

  if (delayMs === null || delayMs === 0) {
    reply();
  } else {
    setTimeout(reply, delayMs).unref();
  }
};

const applyProcedureReply = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  state: ActiveFrameState
): boolean => {
  const pathname = toPathname(req);
  const procedures = toProcedures(pathname);

  if (procedures === null) {
    return false;
  }

  const method = (req.method ?? "GET").toUpperCase();
  const mocks = state.resolved.def.mocks ?? [];
  const rules = toProcedureRules(mocks, method, pathname, procedures);
  const found: MockRule[] = rules.filter((rule) => isRule(rule));

  if (found.length === 0 || found.length !== rules.length) {
    return false;
  }

  const bodies = found.map((rule, at) =>
    toEnvelope(rule, procedures[at] ?? "")
  );

  const isFailed = found.every(
    (rule) => (rule.status ?? OK_STATUS) >= FAILED_STATUS
  );

  const delays = found.map((rule) => rule.delayMs ?? 0);
  let status = OK_STATUS;
  let body = bodies[0] ?? null;

  if (isFailed) {
    status = found[0]?.status ?? SERVER_ERROR_STATUS;
  }

  if (isBatchCall(req.url ?? "", procedures.length)) {
    body = bodies;
  }

  applyJsonReply(res, status, body, Math.max(0, ...delays));

  return true;
};

const toSplicePlan = (
  state: ActiveFrameState,
  req: http.IncomingMessage
): CallPlan | null => {
  const pathname = toPathname(req);
  const procedures = toProcedures(pathname);
  const method = (req.method ?? "GET").toUpperCase();

  if (procedures === null || method !== "GET" || isJsonlCall(req)) {
    return null;
  }

  const mocks = state.resolved.def.mocks ?? [];
  const rules = toProcedureRules(mocks, method, pathname, procedures);

  if (!rules.some((rule) => isRule(rule))) {
    return null;
  }

  return { mode: "splice", procedures, rules };
};

const toCallPlan = (
  state: ActiveFrameState | null,
  req: http.IncomingMessage
): CallPlan | null => {
  if (state === null || !isDataPath(toPathname(req))) {
    return null;
  }

  const { def, projectDir } = state.resolved;
  const recorder = toTrialRecorder(projectDir, def.id);

  if (recorder !== null) {
    return { mode: "record", recorder };
  }

  if (def.kind === "empty" && !isJsonlCall(req)) {
    return { mode: "empty" };
  }

  if (def.kind === "mock") {
    return toSplicePlan(state, req);
  }

  return null;
};

export {
  applyProcedureReply,
  applyJsonReply,
  isDataPath,
  toCallPlan,
  toErrorBody,
};
