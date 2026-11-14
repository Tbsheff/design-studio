import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { TOKENS_FILE } from "@design-studio/contracts";
import { Effect } from "effect";

import {
  BadRequestError,
  getThemeTokenBase,
  readDesignSystemFiles,
  runDirectionRead,
  runDirectionWrite,
  toDirectEditStatusFailure,
  updateThemeTokens,
} from "./deps.js";
import type {
  DirectionIds,
  KnownFailure,
  ThemeTokenBase,
  TokenChange,
} from "./deps.js";
import { toLinkedFamilies, toThemes } from "./engine/index.js";
import type { ThemeChange } from "./engine/index.js";
import { toRadiusPath, toThemeSource } from "./theme-base.js";
import { toItem } from "./theme-model.js";
import type {
  StoredTheme,
  ThemeApplied,
  ThemeCreated,
  ThemeFile,
  ThemeSetResult,
} from "./theme-model.js";
import { getSavedThemes, setSavedThemes } from "./theme-saved.js";
import { toSeedOf } from "./theme-seed.js";
import { createStarterVersion, isStarterProject } from "./theme-starter.js";

interface CreateThemeCommand extends DirectionIds {
  readonly brief: string | null;
  readonly count: number;
  readonly seed: number | null;
}

interface SetThemeCommand extends DirectionIds {
  readonly themeId: string | null;
}

interface ApplyThemeCommand extends DirectionIds {
  readonly themeId: string;
}

const NO_TOKENS =
  "This direction has no token file. Apply a design system first, or attach an app that has CSS tokens.";

const toMissing = (themeId: string): NotFound =>
  new NotFound({
    message: `No stored theme has the id ${themeId}. Call list_theme to see the ids, or create_theme to make new ones.`,
  });

const toTokenChange = (change: ThemeChange): TokenChange => {
  if (change.darkValue === null) {
    return { path: change.path, value: change.value };
  }

  return {
    darkValue: change.darkValue,
    path: change.path,
    value: change.value,
  };
};

const getThemeBase = (
  ids: DirectionIds
): Effect.Effect<ThemeTokenBase, KnownFailure> =>
  runDirectionRead(
    ids,
    async ({ direction, project }): Promise<ThemeTokenBase> => {
      const base = await getThemeTokenBase(project, direction);

      if (base === null) {
        throw new BadRequestError(NO_TOKENS);
      }

      return base;
    },
    toDirectEditStatusFailure
  );

const getLinkedFonts = (
  ids: DirectionIds,
  base: ThemeTokenBase
): Effect.Effect<readonly string[], KnownFailure> =>
  runDirectionRead(
    ids,
    async ({ direction }): Promise<readonly string[]> => {
      if (base.file !== TOKENS_FILE) {
        return [];
      }

      const files = await readDesignSystemFiles(direction.workTree);

      return toLinkedFamilies(files?.manifest?.fonts.googleFontsUrl ?? null);
    },
    toDirectEditStatusFailure
  );

const isStarterNeeded = (
  ids: DirectionIds
): Effect.Effect<boolean, KnownFailure> =>
  runDirectionRead(
    ids,
    async ({ direction, project }): Promise<boolean> =>
      isStarterProject(project) &&
      (await getThemeTokenBase(project, direction)) === null,
    toDirectEditStatusFailure
  );

const createStarterBase = Effect.fn("ThemeRun.createStarterBase")(function* run(
  command: CreateThemeCommand
) {
  if (!(yield* isStarterNeeded(command))) {
    return;
  }

  yield* runDirectionWrite(
    command,
    ({ direction, project, runtime }): Promise<boolean> =>
      createStarterVersion(
        runtime.editDeps,
        project,
        direction,
        command.brief ?? project.name
      ),
    toDirectEditStatusFailure
  );
});

const inspectDirection = (
  ids: DirectionIds
): Effect.Effect<void, KnownFailure> =>
  runDirectionRead(ids, () => Promise.resolve(), toDirectEditStatusFailure);

const runThemeCreate = Effect.fn("ThemeRun.create")(function* run(
  command: CreateThemeCommand
) {
  yield* createStarterBase(command);
  const base = yield* getThemeBase(command);
  const saved = yield* getSavedThemes(command);
  const linked = yield* getLinkedFonts(command, base);
  const source = toThemeSource(base);
  const chosenSeed = command.seed ?? toSeedOf(saved.candidates);

  const made = toThemes({
    baseColor: source.baseColor,
    brief: command.brief,
    count: command.count,
    fonts: source.fonts,
    linkedFonts: linked,
    radiusDefault: null,
    radiusPath: toRadiusPath(base),
    seed: chosenSeed,
    tokens: source.tokens,
  });

  if (!made.ok) {
    return yield* new BadRequest({
      message: `Could not build ${command.count} themes (${made.code}). Check that the token file has color bg, fg, primary and primary-fg tokens.`,
    });
  }

  const tokenFile = base.file;

  const candidates: StoredTheme[] = made.value.map((draft) => ({
    changes: draft.changes,
    contrast: draft.contrast,
    fontLink: draft.fontLink,
    id: draft.id,
    name: draft.name,
    seed: draft.seed,
    source: null,
    tokenFile,
  }));

  const activeId =
    candidates.find((item) => item.id === saved.activeId)?.id ?? null;

  const file: ThemeFile = { activeId, candidates };

  yield* setSavedThemes(command, file);

  const created: ThemeCreated = {
    candidates: candidates.map((item) => toItem(item, activeId)),
    seed: chosenSeed,
    tokenFile: base.file,
  };

  return created;
});

const runThemeSet = Effect.fn("ThemeRun.set")(function* run(
  command: SetThemeCommand
) {
  yield* inspectDirection(command);
  const saved = yield* getSavedThemes(command);

  if (command.themeId === null) {
    yield* setSavedThemes(command, { ...saved, activeId: null });

    const cleared: ThemeSetResult = {
      activeThemeId: null,
      changes: [],
      name: null,
    };

    return cleared;
  }

  const found =
    saved.candidates.find((item) => item.id === command.themeId) ?? null;

  if (found === null) {
    return yield* toMissing(command.themeId);
  }

  yield* setSavedThemes(command, { ...saved, activeId: found.id });

  const live: ThemeSetResult = {
    activeThemeId: found.id,
    changes: found.changes,
    name: found.name,
  };

  return live;
});

const runThemeApply = Effect.fn("ThemeRun.apply")(function* run(
  command: ApplyThemeCommand
) {
  const saved = yield* getSavedThemes(command);

  const found =
    saved.candidates.find((item) => item.id === command.themeId) ?? null;

  if (found === null) {
    return yield* toMissing(command.themeId);
  }

  const written = yield* runDirectionWrite(
    command,
    ({ direction, project, runtime }) =>
      updateThemeTokens(
        runtime.editDeps,
        project,
        direction,
        found.changes.map((change) => toTokenChange(change))
      ),
    toDirectEditStatusFailure
  );

  yield* setSavedThemes(command, { ...saved, activeId: null });

  const applied: ThemeApplied = {
    applied: found.changes.length,
    name: found.name,
    themeId: found.id,
    title: "Apply theme",
    tokenFile: written.file,
    versionId: written.versionId,
  };

  return applied;
});

export { getThemeBase, runThemeApply, runThemeCreate, runThemeSet };

export type { ApplyThemeCommand, CreateThemeCommand, SetThemeCommand };
