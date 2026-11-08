import { readFile } from "node:fs/promises";

import { parseModuleFile, planImports } from "./deps.js";
import type { DirectionRun, ImportNeed } from "./deps.js";
import { applySplices, toDriftSplices } from "./engine/index.js";
import type { DriftMatch, DriftSkipReason, Splice } from "./engine/index.js";
import { toNeed } from "./kit-drift-import.js";
import type { ImportScope } from "./kit-drift-import.js";
import { listDriftFiles, listDriftIn } from "./kit-drift-scan.js";
import type { FileDrift } from "./kit-drift-scan.js";
import { isInsideKit } from "./kit-inventory.js";
import type { KitInventory } from "./kit-inventory.js";
import type { Ts } from "./ts-type.js";

type SkipReason = DriftSkipReason | "inside-kit" | "not-found";

interface Skipped {
  readonly id: string;
  readonly reason: SkipReason;
}

interface FileChange {
  readonly after: string;
  readonly before: string;
  readonly ids: readonly string[];
  readonly relative: string;
}

interface FilePlan {
  readonly change: FileChange | null;
  readonly failure: DriftSkipReason | null;
}

interface KitDriftPlan {
  readonly changes: readonly FileChange[];
  readonly skipped: readonly Skipped[];
}

interface Selection {
  readonly byFile: ReadonlyMap<FileDrift, readonly DriftMatch[]>;
  readonly missing: readonly string[];
  readonly skipped: readonly Skipped[];
}

const getSyntaxErrorCount = (ts: Ts, file: string, code: string): number => {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.Latest,
    },
    fileName: file,
    reportDiagnostics: true,
  });

  return result.diagnostics?.length ?? 0;
};

const listNeeds = (
  scope: ImportScope,
  absolute: string,
  matches: readonly DriftMatch[]
): ImportNeed[] => {
  const names = [...new Set(matches.map((match) => match.component))];

  return names.flatMap((name) => {
    const entry = scope.inventory.entries.get(name) ?? null;

    if (entry === null) {
      return [];
    }

    return [toNeed(scope, entry, absolute)];
  });
};

const listFileSplices = (
  scope: ImportScope,
  entry: FileDrift,
  code: string,
  matches: readonly DriftMatch[]
): Splice[] | null => {
  const ast = parseModuleFile(code, entry.absolute);

  if (ast === null) {
    return null;
  }

  const plan = planImports(
    scope.ts,
    code,
    ast,
    listNeeds(scope, entry.absolute, matches)
  );

  return [
    ...matches.flatMap((match) => toDriftSplices(code, match)),
    ...plan.splices,
  ];
};

const createFilePlan = async (
  scope: ImportScope,
  entry: FileDrift,
  matches: readonly DriftMatch[]
): Promise<FilePlan> => {
  const code = await readFile(entry.absolute, "utf-8");
  let splices: Splice[] | null = null;

  try {
    splices = listFileSplices(scope, entry, code, matches);
  } catch {
    return { change: null, failure: "name-clash" };
  }

  if (splices === null) {
    return { change: null, failure: "parse-failed" };
  }

  const after = applySplices(code, splices);
  const { ts } = scope;

  if (
    getSyntaxErrorCount(ts, entry.absolute, after) >
    getSyntaxErrorCount(ts, entry.absolute, code)
  ) {
    return { change: null, failure: "parse-failed" };
  }

  return {
    change: {
      after,
      before: code,
      ids: matches.map((match) => match.id),
      relative: entry.file,
    },
    failure: null,
  };
};

const toSelection = (
  files: readonly FileDrift[],
  ids: readonly string[]
): Selection => {
  const index = new Map<string, { entry: FileDrift; match: DriftMatch }>();

  for (const entry of files) {
    for (const match of entry.matches) {
      index.set(match.id, { entry, match });
    }
  }

  const byFile = new Map<FileDrift, DriftMatch[]>();
  const skipped: Skipped[] = [];
  const missing: string[] = [];

  for (const id of new Set(ids)) {
    const found = index.get(id) ?? null;

    if (found === null) {
      missing.push(id);
    } else if (found.match.skip === null) {
      byFile.set(found.entry, [
        ...(byFile.get(found.entry) ?? []),
        found.match,
      ]);
    } else {
      skipped.push({ id, reason: found.match.skip });
    }
  }

  return { byFile, missing, skipped };
};

const listMissingSkips = async (
  ts: Ts,
  inventory: KitInventory,
  missing: readonly string[]
): Promise<Skipped[]> => {
  if (missing.length === 0) {
    return [];
  }

  const kitFiles = inventory.library.files.filter((file) =>
    isInsideKit(inventory, file)
  );

  const inKit = await listDriftIn(ts, inventory, kitFiles);

  const known = new Set(
    inKit.flatMap((entry) => entry.matches.map((match) => match.id))
  );

  return missing.map((id): Skipped => {
    if (known.has(id)) {
      return { id, reason: "inside-kit" };
    }

    return { id, reason: "not-found" };
  });
};

const createSelectionPlan = async (
  scope: ImportScope,
  selection: Selection
): Promise<KitDriftPlan> => {
  const plans = await Promise.all(
    [...selection.byFile].map(async ([entry, matches]) => ({
      matches,
      plan: await createFilePlan(scope, entry, matches),
    }))
  );

  const failed = plans.flatMap(({ matches, plan }): Skipped[] => {
    const reason = plan.failure;

    if (reason === null) {
      return [];
    }

    return matches.map((match): Skipped => ({ id: match.id, reason }));
  });

  return {
    changes: plans.flatMap(({ plan }) => {
      if (plan.change === null) {
        return [];
      }

      return [plan.change];
    }),
    skipped: [...selection.skipped, ...failed],
  };
};

const createKitDriftPlan = async (
  run: DirectionRun,
  ts: Ts,
  inventory: KitInventory,
  ids: readonly string[]
): Promise<KitDriftPlan> => {
  const { project } = run;
  const scope: ImportScope = { inventory, project, ts };
  const files = await listDriftFiles(ts, inventory, null);
  const selection = toSelection(files, ids);

  const [missing, planned] = await Promise.all([
    listMissingSkips(ts, inventory, selection.missing),
    createSelectionPlan(scope, selection),
  ]);

  return {
    changes: planned.changes,
    skipped: [...planned.skipped, ...missing],
  };
};

export { createKitDriftPlan };

export type { FileChange, KitDriftPlan, SkipReason, Skipped };
