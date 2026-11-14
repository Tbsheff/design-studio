import { listPortKitFinds } from "../components/kit-drift/index.js";
import type {
  PortKitFind,
  PortKitScope,
} from "../components/kit-drift/index.js";
import { NEAR_LINES, toChangedEntry } from "./screens.js";
import type { ChangedFile } from "./screens.js";

interface AppKitCheck {
  readonly finds: readonly PortKitFind[];
  readonly oldCode: number;
}

const TSX_FILE = /\.[jt]sx$/u;

const NO_KIT: AppKitCheck = { finds: [], oldCode: 0 };

const isNearChanged = (
  changed: readonly ChangedFile[],
  source: string
): boolean => {
  const hit = toChangedEntry(source, changed);

  if (hit === null) {
    return false;
  }

  const { line } = hit;
  const { lines } = hit.entry;

  if (lines === null || line === null) {
    return true;
  }

  return lines.some(([from, to]) => line >= from - NEAR_LINES && line <= to);
};

const inspectAppKit = async (
  scope: PortKitScope,
  changed: readonly ChangedFile[]
): Promise<AppKitCheck> => {
  const files = changed.flatMap((entry) => {
    if (TSX_FILE.test(entry.file)) {
      return [entry.file];
    }

    return [];
  });

  if (files.length === 0) {
    return NO_KIT;
  }

  const finds = (await listPortKitFinds(scope, files)) ?? [];

  const near = finds.filter((find) =>
    isNearChanged(changed, `${find.file}:${find.line}`)
  );

  return { finds: near, oldCode: finds.length - near.length };
};

export { inspectAppKit, isNearChanged };

export type { AppKitCheck };
