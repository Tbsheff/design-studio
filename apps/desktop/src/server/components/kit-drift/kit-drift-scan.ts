import { stat } from "node:fs/promises";
import path from "node:path";

import { toDriftMatches } from "./engine/index.js";
import type { DriftMatch } from "./engine/index.js";
import { KitDriftError } from "./errors.js";
import { isInsideKit } from "./kit-inventory.js";
import type { KitInventory } from "./kit-inventory.js";
import { listFileElements, listSourceFiles } from "./source-files.js";
import type { Ts } from "./ts-type.js";

interface FileDrift {
  readonly absolute: string;
  readonly file: string;
  readonly matches: readonly DriftMatch[];
}

const toRelative = (root: string, absolute: string): string =>
  path.relative(root, absolute).split(path.sep).join("/");

const isFile = async (absolute: string): Promise<boolean> => {
  try {
    const info = await stat(absolute);

    return info.isFile();
  } catch {
    return false;
  }
};

const isInsideRoot = (root: string, absolute: string): boolean =>
  absolute.startsWith(root + path.sep);

const getPageFile = async (
  inventory: KitInventory,
  page: string
): Promise<string> => {
  const candidates = [
    path.resolve(inventory.appRoot, page),
    path.resolve(inventory.root, page),
  ].filter((candidate) => isInsideRoot(inventory.root, candidate));

  const found = await Promise.all(
    candidates.map(async (candidate) => ({
      candidate,
      isReal: await isFile(candidate),
    }))
  );

  const first = found.find((entry) => entry.isReal);

  if (first) {
    return first.candidate;
  }

  throw new KitDriftError(`The page ${page} is not a source file of this app.`);
};

const listTargets = async (
  inventory: KitInventory,
  page: string | null
): Promise<string[]> => {
  if (page !== null) {
    return [await getPageFile(inventory, page)];
  }

  return await listSourceFiles(inventory.appRoot, (absolute) =>
    isInsideKit(inventory, `${absolute}${path.sep}`)
  );
};

const listDriftIn = async (
  ts: Ts,
  inventory: KitInventory,
  absolutes: readonly string[]
): Promise<FileDrift[]> => {
  const scanned = await Promise.all(
    absolutes.map(async (absolute): Promise<FileDrift> => {
      const elements = await listFileElements(ts, absolute);
      const file = toRelative(inventory.root, absolute);

      return {
        absolute,
        file,
        matches: toDriftMatches({
          elements,
          file,
          kit: inventory.components,
        }),
      };
    })
  );

  return scanned.filter((entry) => entry.matches.length > 0);
};

const listDriftFiles = async (
  ts: Ts,
  inventory: KitInventory,
  page: string | null
): Promise<FileDrift[]> => {
  const absolutes = await listTargets(inventory, page);

  if (page !== null && isInsideKit(inventory, absolutes[0] ?? "")) {
    return [];
  }

  return await listDriftIn(ts, inventory, absolutes);
};

export { listDriftFiles, listDriftIn };

export type { FileDrift };
