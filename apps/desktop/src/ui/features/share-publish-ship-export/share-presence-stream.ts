import type { SharePresenceEvent } from "@design-studio/contracts/share";

import { isFieldSource } from "../../platform/json-guard.js";

const EVENT_BREAK = "\n\n";
const DATA_PREFIX = "data:";
const DATA_PREFIX_LENGTH = 5;
const PING_EVENT = /^event: ping/mu;
const EVENT_TYPES = new Set(["cursor", "idle", "leave", "state"]);

type PresenceListener = (event: SharePresenceEvent) => void;

const isPresenceEvent = (value: unknown): value is SharePresenceEvent => {
  if (!isFieldSource(value)) {
    return false;
  }

  const type = new Map(Object.entries(value)).get("type");

  return EVENT_TYPES.has(String(type));
};

const toBlockData = (block: string): string =>
  block
    .split("\n")
    .filter((line) => line.startsWith(DATA_PREFIX))
    .map((line) => line.slice(DATA_PREFIX_LENGTH).trimStart())
    .join("\n");

const dispatchBlock = (block: string, onEvent: PresenceListener): void => {
  if (PING_EVENT.test(block)) {
    return;
  }

  const data = toBlockData(block);

  if (!data) {
    return;
  }

  const event: unknown = JSON.parse(data);

  if (isPresenceEvent(event)) {
    onEvent(event);
  }
};

const drainBlocks = (buffer: string, onEvent: PresenceListener): string => {
  const blocks = buffer.split(EVENT_BREAK);
  const rest = blocks.pop() ?? "";

  for (const block of blocks) {
    dispatchBlock(block, onEvent);
  }

  return rest;
};

const pumpEvents = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decoder: TextDecoder,
  buffer: string,
  onEvent: PresenceListener
): Promise<void> => {
  const { done, value } = await reader.read();

  if (done) {
    return;
  }

  const text = buffer + decoder.decode(value, { stream: true });
  await pumpEvents(reader, decoder, drainBlocks(text, onEvent), onEvent);
};

const readEvents = async (
  response: Response,
  onEvent: PresenceListener
): Promise<void> => {
  const reader = response.body?.getReader();

  if (!reader) {
    return;
  }

  await pumpEvents(reader, new TextDecoder(), "", onEvent);
};

export { readEvents };

export type { PresenceListener };
