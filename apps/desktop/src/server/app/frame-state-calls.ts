import type http from "node:http";

import {
  isProcedureRule,
  mockRuleMatches,
} from "@design-studio/contracts/frame-state";
import type { MockRule } from "@design-studio/contracts/frame-state";
import { Schema } from "effect";

import { logError } from "../platform/logger/index.js";
import type { RecordedBody, ResponseRecorder } from "./frame-state-trial.js";

interface SplicePlan {
  readonly mode: "splice";
  readonly procedures: readonly string[];
  readonly rules: readonly (MockRule | null)[];
}

interface RecordPlan {
  readonly mode: "record";
  readonly recorder: ResponseRecorder;
}

interface EmptyPlan {
  readonly mode: "empty";
}

type CallPlan = EmptyPlan | RecordPlan | SplicePlan;

interface UpstreamReply {
  readonly headers: http.OutgoingHttpHeaders;
  readonly req: http.IncomingMessage;
  readonly res: http.ServerResponse;
  readonly status: number;
  readonly upstreamRes: http.IncomingMessage;
}

const MAX_BODY = 5_242_880;

const MAX_RECORD_BODY = 1_048_576;

const FAILED_STATUS = 400;

const OK_STATUS = 200;

const SERVER_ERROR_STATUS = 500;

const SERVER_ERROR_CODE = -32_603;

const TRPC_MARK = "/trpc/";

const ERROR_MESSAGE = "Design Studio error state: this call failed on purpose.";

const plans = new WeakMap<http.IncomingMessage, CallPlan>();

const isJsonBody = Schema.is(Schema.Json);

const isEnvelope = Schema.is(
  Schema.Union([
    Schema.Struct({ result: Schema.Json }),
    Schema.Struct({ error: Schema.Json }),
  ])
);

const isRule = (rule: MockRule | null): rule is MockRule => rule !== null;

const isJsonOk = (
  status: number,
  upstreamRes: http.IncomingMessage
): boolean => {
  const type = upstreamRes.headers["content-type"] ?? "";

  return (
    status < FAILED_STATUS && type.includes("json") && !type.includes("jsonl")
  );
};

const toProcedures = (pathname: string): string[] | null => {
  const at = pathname.indexOf(TRPC_MARK);

  if (at === -1) {
    return null;
  }

  const tail = decodeURIComponent(pathname.slice(at + TRPC_MARK.length));

  if (tail === "") {
    return null;
  }

  return tail.split(",");
};

const isBatchCall = (url: string, count: number): boolean => {
  const search = url.split("?")[1] ?? "";

  return count > 1 || new URLSearchParams(search).get("batch") === "1";
};

const toTrpcError = (procedure: string): RecordedBody => {
  const code = "INTERNAL_SERVER_ERROR";
  const data = { code, httpStatus: SERVER_ERROR_STATUS, path: procedure };
  const message = ERROR_MESSAGE;
  const json = { code: SERVER_ERROR_CODE, data, message };

  return { error: { code: SERVER_ERROR_CODE, data, json, message } };
};

const toEnvelope = (rule: MockRule, procedure: string): RecordedBody => {
  const { body } = rule;

  if (isEnvelope(body)) {
    return body;
  }

  if ((rule.status ?? OK_STATUS) >= FAILED_STATUS) {
    return toTrpcError(procedure);
  }

  if (isJsonBody(body)) {
    return { result: { data: body } };
  }

  return { result: { data: null } };
};

const toProcedureRules = (
  mocks: readonly MockRule[],
  method: string,
  pathname: string,
  procedures: readonly string[]
): (MockRule | null)[] => {
  const mark = pathname.indexOf(TRPC_MARK) + TRPC_MARK.length;
  const prefix = pathname.slice(0, mark);
  const rules = mocks.filter((rule) => isProcedureRule(rule));

  return procedures.map(
    (procedure) =>
      rules.find((rule) =>
        mockRuleMatches(rule, method, `${prefix}${procedure}`)
      ) ?? null
  );
};

const toBodyText = (
  upstreamRes: http.IncomingMessage,
  limit: number,
  onDone: (text: string | null) => void
): void => {
  const chunks: Buffer[] = [];
  let size = 0;

  upstreamRes.on("data", (chunk: Buffer) => {
    size += chunk.length;

    if (size <= limit) {
      chunks.push(chunk);
    }
  });
  upstreamRes.on("end", () => {
    if (size > limit) {
      onDone(null);

      return;
    }

    onDone(Buffer.concat(chunks).toString("utf-8"));
  });
};

const toRecordedBody = (
  text: string | null,
  type: string,
  status: number
): RecordedBody => {
  const isJson = type.includes("json") && !type.includes("jsonl");

  if (text === null || !isJson || status >= FAILED_STATUS) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const applyRecording = (
  reply: UpstreamReply,
  recorder: ResponseRecorder
): void => {
  const { headers, req, res, status, upstreamRes } = reply;
  const type = String(upstreamRes.headers["content-type"] ?? "");
  const pathname = (req.url ?? "/").split("?")[0] ?? "/";
  const method = (req.method ?? "GET").toUpperCase();

  res.writeHead(status, headers);
  toBodyText(upstreamRes, MAX_RECORD_BODY, (text) => {
    const body = toRecordedBody(text, type, status);

    try {
      recorder({ body, method, pathname, status });
    } catch (error) {
      logError("[frame-state] recorder failed", error);
    }
  });
  upstreamRes.pipe(res);
};

const toSplicedBody = (text: string, plan: SplicePlan): string => {
  try {
    const parsed: RecordedBody = JSON.parse(text);

    if (!Array.isArray(parsed) || parsed.length !== plan.rules.length) {
      return text;
    }

    return JSON.stringify(
      parsed.map((entry: RecordedBody, at) => {
        const rule = plan.rules[at] ?? null;

        if (rule === null) {
          return entry;
        }

        return toEnvelope(rule, plan.procedures[at] ?? "");
      })
    );
  } catch {
    return text;
  }
};

const applySplice = (reply: UpstreamReply, plan: SplicePlan): void => {
  const { headers, res, status, upstreamRes } = reply;

  toBodyText(upstreamRes, MAX_BODY, (text) => {
    res.writeHead(status, { ...headers, "x-studio-mock": "1" });
    res.end(toSplicedBody(text ?? "", plan));
  });
  upstreamRes.on("error", () => res.destroy());
};

export {
  applyRecording,
  applySplice,
  isBatchCall,
  isJsonOk,
  isRule,
  plans,
  toEnvelope,
  toProcedureRules,
  toProcedures,
  toTrpcError,
};

export type { CallPlan, SplicePlan, UpstreamReply };
