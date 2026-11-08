import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Effect } from "effect";

import { attemptKnown } from "./deps.js";
import type { DirectionIds } from "./deps.js";
import { toReferenceTheme } from "./engine/index.js";
import { toRadiusPath, toThemeSource } from "./theme-base.js";
import { toImagePalette } from "./theme-import-image.js";
import { toImageReference, toUrlReference } from "./theme-import-source.js";
import type { ThemeStyleSample } from "./theme-import-source.js";
import { toItem } from "./theme-model.js";
import type { StoredTheme, ThemeFile, ThemeImported } from "./theme-model.js";
import { getThemeBase } from "./theme-run.js";
import { getSavedThemes, setSavedThemes } from "./theme-saved.js";

interface ImportThemeCommand extends DirectionIds {
  readonly imagePath: string | null;
  readonly name: string | null;
  readonly sample: ThemeStyleSample | null;
  readonly url: string | null;
}

const CANDIDATES_MAX = 12;

const NAME_MAX = 80;

const SOURCE_RULE =
  "Give exactly one of url and imagePath. Leave the other one null.";

const readImage = Effect.fn("ThemeImport.readImage")(function* run(
  imagePath: string
) {
  const swatches = yield* attemptKnown(() => toImagePalette(imagePath));

  return toImageReference(imagePath, swatches);
});

const readReference = Effect.fn("ThemeImport.read")(function* run(
  command: ImportThemeCommand
) {
  if (command.url !== null && command.imagePath === null) {
    if (command.sample === null) {
      return yield* new BadRequest({
        message: "Could not read the styles of this page. Import it again.",
      });
    }

    return toUrlReference(command.url, command.sample);
  }

  if (command.imagePath !== null && command.url === null) {
    return yield* readImage(command.imagePath);
  }

  return yield* new BadRequest({ message: SOURCE_RULE });
});

const toStoredFile = (saved: ThemeFile, stored: StoredTheme): ThemeFile => {
  const others = saved.candidates.filter((item) => item.id !== stored.id);

  return {
    activeId: saved.activeId,
    candidates: [stored, ...others].slice(0, CANDIDATES_MAX),
  };
};

const runThemeImport = Effect.fn("ThemeImport.run")(function* run(
  command: ImportThemeCommand
) {
  const base = yield* getThemeBase(command);
  const reference = yield* readReference(command);
  const saved = yield* getSavedThemes(command);

  const made = toReferenceTheme({
    colors: reference.colors,
    fonts: reference.fonts,
    name: (command.name ?? reference.label).slice(0, NAME_MAX),
    radius: reference.radius,
    radiusPath: toRadiusPath(base),
    sourceKey: `${reference.kind}:${reference.value}`,
    tokens: toThemeSource(base).tokens,
  });

  if (!made.ok) {
    return yield* new BadRequest({
      message: `Could not build a theme from this source (${made.code}). Check that the token file has color bg, fg, primary and primary-fg tokens.`,
    });
  }

  const { draft } = made.value;

  const stored: StoredTheme = {
    changes: draft.changes,
    contrast: draft.contrast,
    fontLink: draft.fontLink,
    id: draft.id,
    name: draft.name,
    seed: draft.seed,
    source: { kind: reference.kind, value: reference.value },
    tokenFile: base.file,
  };

  yield* setSavedThemes(command, toStoredFile(saved, stored));

  const imported: ThemeImported = {
    candidates: [toItem(stored, saved.activeId)],
    extracted: {
      colors: reference.colors.swatches.map((swatch) => ({
        hex: swatch.hex,
        share: swatch.share,
      })),
      fonts: reference.fontNames,
      radius: made.value.radius,
    },
    source: { kind: reference.kind, value: reference.value },
    tokenFile: base.file,
  };

  return imported;
});

export { runThemeImport };

export type { ImportThemeCommand };
