import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  ShipRecordSchema,
  ShipSettingsSchema,
} from "@design-studio/actions/ship/schema";
import {
  DEFAULT_SHIP_SETTINGS,
  type ShipRecord,
  type ShipSettings,
} from "@design-studio/contracts/ship";
import { Result } from "effect";

import { toDecoder } from "../platform/decode/index.js";

const FILE = "ship.json";
const HISTORY_KEEP = 20;

const decodeSettings = toDecoder(ShipSettingsSchema, "error");
const decodeRecord = toDecoder(ShipRecordSchema, "ignore");

export interface ShipState {
  settings: ShipSettings;
  history: ShipRecord[];
}

const fileOf = (projectDir: string) => path.join(projectDir, FILE);

export async function readShipState(projectDir: string): Promise<ShipState> {
  const parsed: unknown = JSON.parse(
    await readFile(fileOf(projectDir), "utf-8").catch(() => "{}")
  );
  const raw = (typeof parsed === "object" && parsed !== null ? parsed : {}) as {
    settings?: unknown;
    history?: unknown;
  };
  const settings = decodeSettings({
    ...DEFAULT_SHIP_SETTINGS,
    ...(typeof raw.settings === "object" && raw.settings !== null
      ? raw.settings
      : {}),
  });
  const history = Array.isArray(raw.history)
    ? raw.history.flatMap((item) => {
        const decoded = decodeRecord(item);
        return Result.isSuccess(decoded) ? [decoded.success] : [];
      })
    : [];
  return {
    settings: Result.isSuccess(settings)
      ? settings.success
      : { ...DEFAULT_SHIP_SETTINGS },
    history: history.slice(-HISTORY_KEEP),
  };
}

async function writeShipState(
  projectDir: string,
  state: ShipState
): Promise<void> {
  const file = fileOf(projectDir);
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${randomBytes(4).toString("hex")}`;
  await writeFile(temp, `${JSON.stringify(state, null, 2)}\n`);
  await rename(temp, file);
}

export async function saveShipSettings(
  projectDir: string,
  settings: ShipSettings
): Promise<ShipSettings> {
  const state = await readShipState(projectDir);
  await writeShipState(projectDir, { ...state, settings });
  return settings;
}

export async function addShipRecord(
  projectDir: string,
  record: ShipRecord
): Promise<void> {
  const state = await readShipState(projectDir);
  await writeShipState(projectDir, {
    ...state,
    history: [...state.history, record].slice(-HISTORY_KEEP),
  });
}
