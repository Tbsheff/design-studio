import type { Context } from "hono";

import type { TelemetrySample } from "../../shared/contracts.js";
import { BadRequestError } from "../platform/errors/index.js";

const HEARTBEAT_MS = 15_000;

const TELEMETRY_KINDS = new Set<TelemetrySample["kind"]>([
  "preview.latency",
  "select.latency",
  "studio.open",
  "file.write",
  "app.start",
  "run.first_token",
  "edit.commit",
  "frame.long",
]);

const APP_TELEMETRY_KINDS = new Set<TelemetrySample["kind"]>([
  "app.start",
  "frame.long",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBody(c: Context): Promise<Record<string, unknown>> {
  const text = await c.req.text();

  if (text.trim() === "") {
    return {};
  }
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestError("body must be JSON");
  }

  if (!isRecord(parsed)) {
    throw new BadRequestError("body must be a JSON object");
  }
  return parsed;
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`${key} is required`);
  }
  return value;
}

function optionalString(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const value = body[key];

  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new BadRequestError(`${key} must be a string`);
  }
  return value;
}

export {
  APP_TELEMETRY_KINDS,
  HEARTBEAT_MS,
  TELEMETRY_KINDS,
  isRecord,
  optionalString,
  readBody,
  requireString,
};
