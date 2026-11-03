import type { Effect } from "effect";

import { inspectSourceUpload } from "./engine/inspect-source-upload.js";
import type { UploadFacts } from "./engine/inspect-source-upload.js";
import { toScrubbedText } from "./engine/to-scrubbed-text.js";
import { canUpload } from "./engine/to-sync-policy.js";
import type { PolicyInput, UploadKind } from "./engine/to-sync-policy.js";

type OutboxOp = "delete" | "upsert";

type PayloadValue = boolean | number | string | null;

type OutboxPayload = Readonly<Record<string, PayloadValue>>;

interface OutboxEntry {
  readonly op: OutboxOp;
  readonly payload: OutboxPayload;
  readonly rowId: string;
  readonly rowRev: number;
  readonly table: string;
}

interface OutboxRow {
  readonly rowId: string;
  readonly rowRev: number;
  readonly table: string;
}

interface PayloadRequest {
  readonly fields: OutboxPayload;
  readonly policy: PolicyInput;
  readonly source: UploadFacts | null;
  readonly uploadKind: UploadKind;
}

interface OutboxStoreApi {
  readonly ack: (rows: readonly OutboxRow[]) => Effect.Effect<number>;
  readonly append: (entry: OutboxEntry) => Effect.Effect<void>;
  readonly compact: () => Effect.Effect<void>;
  readonly listPending: (
    limit: number
  ) => Effect.Effect<readonly OutboxEntry[]>;
}

type OutboxLine = { readonly ack: OutboxRow } | { readonly entry: OutboxEntry };

const CLOUD_DIR = "cloud";

const OUTBOX_FILE = "outbox.jsonl";

const FORBIDDEN_FIELDS: ReadonlySet<string> = new Set([
  "body",
  "bytes",
  "content",
  "contents",
  "data",
  "frame",
  "frames",
  "html",
  "jsonl",
  "path",
  "paths",
  "realPath",
  "sourcePath",
  "text",
]);

const toRowKey = (row: OutboxRow): string => `${row.table}\u0000${row.rowId}`;

const toOutboxPayload = (request: PayloadRequest): OutboxPayload | null => {
  if (!canUpload(request.policy, request.uploadKind)) {
    return null;
  }

  if (request.source !== null && !inspectSourceUpload(request.source).ok) {
    return null;
  }

  const allowed = Object.entries(request.fields).filter(
    ([name]) => !FORBIDDEN_FIELDS.has(name)
  );

  const scrubbed = toScrubbedText(JSON.stringify(Object.fromEntries(allowed)));

  return JSON.parse(scrubbed) as OutboxPayload;
};

const toLineOrNull = (line: string): OutboxLine | null => {
  try {
    return JSON.parse(line) as OutboxLine;
  } catch {
    return null;
  }
};

const applyLine = (
  pending: Map<string, OutboxEntry>,
  parsed: OutboxLine | null
): void => {
  if (parsed === null) {
    return;
  }

  if ("entry" in parsed) {
    pending.set(toRowKey(parsed.entry), parsed.entry);

    return;
  }

  const current = pending.get(toRowKey(parsed.ack));

  if ((current?.rowRev ?? Number.POSITIVE_INFINITY) <= parsed.ack.rowRev) {
    pending.delete(toRowKey(parsed.ack));
  }
};

const toPending = (text: string): Map<string, OutboxEntry> => {
  const pending = new Map<string, OutboxEntry>();

  for (const line of text.split("\n")) {
    applyLine(pending, toLineOrNull(line));
  }

  return pending;
};

const toLine = (line: OutboxLine): string => `${JSON.stringify(line)}\n`;

export { CLOUD_DIR, OUTBOX_FILE, toLine, toOutboxPayload, toPending, toRowKey };

export type {
  OutboxEntry,
  OutboxLine,
  OutboxOp,
  OutboxPayload,
  OutboxRow,
  OutboxStoreApi,
  PayloadRequest,
};
