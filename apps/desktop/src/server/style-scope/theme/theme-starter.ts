import { access } from "node:fs/promises";
import path from "node:path";

import {
  PACK_FILE,
  TOKENS_CSS_FILE,
  TOKENS_FILE,
} from "@design-studio/contracts";
import { Effect } from "effect";

import {
  compileTokens,
  parseTokenFile,
  runDirectionRead,
  toDirectEditStatusFailure,
  writeAtomic,
} from "./deps.js";
import type {
  DirectEditDeps,
  Direction,
  DirectionIds,
  DirectionRun,
  Project,
} from "./deps.js";
import { toThemes } from "./engine/index.js";
import type { ThemeChange, ThemeDraft, ThemeRole } from "./engine/index.js";
import type { StoredTheme } from "./theme-model.js";
import { setSavedThemes } from "./theme-saved.js";

interface StarterLookCommand extends DirectionIds {
  readonly brief: string;
}

type StarterColorToken =
  | {
      readonly $extensions: {
        readonly "studio.modes": { readonly dark: string };
      };
      readonly $value: string;
    }
  | { readonly $value: string };

interface StarterColorGroup {
  readonly $description: string;
  readonly $type: "color";
  readonly accent: StarterColorToken;
  readonly "accent-fg": StarterColorToken;
  readonly bg: StarterColorToken;
  readonly border: StarterColorToken;
  readonly fg: StarterColorToken;
  readonly "fg-muted": StarterColorToken;
  readonly primary: StarterColorToken;
  readonly "primary-fg": StarterColorToken;
  readonly ring: StarterColorToken;
  readonly surface: StarterColorToken;
}

interface StarterLook {
  readonly chosen: string;
  readonly options: readonly string[];
  readonly written: readonly string[];
}

const STARTER_COUNT = 3;

const STARTER_SEED = 1;

const STARTER_TITLE = "Starter look";

const STARTER_RADIUS = "10px";

const BRIEF_MAX = 400;

const STARTER_TOKENS = {
  body: "font.body",
  display: "font.display",
  roles: {
    accent: "color.accent",
    accentFg: "color.accent-fg",
    bg: "color.bg",
    border: "color.border",
    fg: "color.fg",
    fgMuted: "color.fg-muted",
    primary: "color.primary",
    primaryFg: "color.primary-fg",
    ring: "color.ring",
    surface: "color.surface",
  },
} as const;

const isFilePresent = async (file: string): Promise<boolean> => {
  try {
    await access(file);

    return true;
  } catch {
    return false;
  }
};

const toUniqueNames = (drafts: readonly ThemeDraft[]): ThemeDraft[] => {
  const seen = new Map<string, number>();

  return drafts.map((draft) => {
    const count = (seen.get(draft.name) ?? 0) + 1;
    seen.set(draft.name, count);

    if (count === 1) {
      return draft;
    }

    return { ...draft, name: `${draft.name} ${count}` };
  });
};

const toStarterDrafts = (brief: string): readonly ThemeDraft[] | null => {
  const made = toThemes({
    baseColor: null,
    brief: brief.trim().slice(0, BRIEF_MAX),
    count: STARTER_COUNT,
    fonts: [],
    seed: STARTER_SEED,
    tokens: STARTER_TOKENS,
  });

  if (!made.ok) {
    return null;
  }

  return toUniqueNames(made.value);
};

const toColorToken = (change: ThemeChange): StarterColorToken => {
  if (change.darkValue === null) {
    return { $value: change.value };
  }

  return {
    $extensions: { "studio.modes": { dark: change.darkValue } },
    $value: change.value,
  };
};

const toFontValue = (draft: ThemeDraft, role: "body" | "display"): string =>
  draft.changes.find((change) => change.role === role)?.value ??
  "system-ui, sans-serif";

const toRoleToken = (
  byRole: ReadonlyMap<string, ThemeChange>,
  role: ThemeRole
): StarterColorToken => {
  const change = byRole.get(role) ?? null;

  if (change === null) {
    return { $value: "currentColor" };
  }

  return toColorToken(change);
};

const toColorGroup = (draft: ThemeDraft): StarterColorGroup => {
  const byRole = new Map(draft.changes.map((change) => [change.role, change]));

  return {
    $description:
      "Starter colors. Each token has its dark value in $extensions.studio.modes.dark.",
    $type: "color",
    accent: toRoleToken(byRole, "accent"),
    "accent-fg": toRoleToken(byRole, "accentFg"),
    bg: toRoleToken(byRole, "bg"),
    border: toRoleToken(byRole, "border"),
    fg: toRoleToken(byRole, "fg"),
    "fg-muted": toRoleToken(byRole, "fgMuted"),
    primary: toRoleToken(byRole, "primary"),
    "primary-fg": toRoleToken(byRole, "primaryFg"),
    ring: toRoleToken(byRole, "ring"),
    surface: toRoleToken(byRole, "surface"),
  };
};

const toStarterTokenText = (draft: ThemeDraft): string =>
  `${JSON.stringify(
    {
      $description: `${STARTER_TITLE} tokens, made from the first prompt.`,
      color: toColorGroup(draft),
      font: {
        $type: "fontFamily",
        body: { $value: toFontValue(draft, "body") },
        display: { $value: toFontValue(draft, "display") },
      },
      radius: { $type: "dimension", md: { $value: STARTER_RADIUS } },
    },
    null,
    2
  )}\n`;

const toFamilyName = (stack: string): string =>
  (stack.split(",")[0] ?? stack).replaceAll(/["']/gu, "").trim();

const toStarterManifestText = (draft: ThemeDraft): string =>
  `${JSON.stringify(
    {
      description: `${STARTER_TITLE} made from the first prompt: ${draft.name}.`,
      fonts: {
        body: toFamilyName(toFontValue(draft, "body")),
        display: toFamilyName(toFontValue(draft, "display")),
        mono: "ui-monospace",
      },
      id: "starter-look",
      license: "MIT",
      mode: "light",
      name: STARTER_TITLE,
      provenance: "original",
      tags: ["starter"],
    },
    null,
    2
  )}\n`;

const createStarterFiles = async (
  workTree: string,
  draft: ThemeDraft
): Promise<readonly string[]> => {
  if (await isFilePresent(path.join(workTree, TOKENS_FILE))) {
    return [];
  }

  const text = toStarterTokenText(draft);
  const parsed = parseTokenFile(text).file;

  if (!parsed) {
    return [];
  }

  const { css } = compileTokens(parsed, { mode: "light" });
  const options = { createDir: true };

  await writeAtomic(path.join(workTree, TOKENS_FILE), text, options);
  await writeAtomic(
    path.join(workTree, PACK_FILE),
    toStarterManifestText(draft),
    options
  );
  await writeAtomic(path.join(workTree, TOKENS_CSS_FILE), css, options);

  return [TOKENS_FILE, PACK_FILE, TOKENS_CSS_FILE];
};

const createStarterVersion = async (
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  brief: string
): Promise<boolean> => {
  const [first] = toStarterDrafts(brief) ?? [];

  if (!first) {
    return false;
  }

  const written = await createStarterFiles(direction.workTree, first);

  if (written.length === 0) {
    return false;
  }

  await deps.versions.commitFile(
    project,
    direction,
    [...written],
    STARTER_TITLE,
    { kind: "manual", prompt: `${STARTER_TITLE}: ${first.name}` }
  );

  return true;
};

const isPlainStarterProject = (project: Project): boolean =>
  project.kind === "html" && !project.app && !project.designSystemFor;

const isStarterProject = (project: Project): boolean =>
  isPlainStarterProject(project) &&
  (project.imported?.created ?? true) &&
  !project.appProjectId;

const toStoredTheme = (draft: ThemeDraft): StoredTheme => ({
  changes: draft.changes,
  contrast: draft.contrast,
  fontLink: draft.fontLink,
  id: draft.id,
  name: draft.name,
  seed: draft.seed,
  source: null,
  tokenFile: TOKENS_FILE,
});

const toStarterTask =
  (draft: ThemeDraft) =>
  ({ direction }: DirectionRun): Promise<readonly string[]> =>
    createStarterFiles(direction.workTree, draft);

const createStarterLook = Effect.fn("ThemeStarter.create")(function* run(
  command: StarterLookCommand
) {
  const drafts = toStarterDrafts(command.brief);
  const [first] = drafts ?? [];

  if (drafts === null || !first) {
    return null;
  }

  const written = yield* runDirectionRead(
    command,
    toStarterTask(first),
    toDirectEditStatusFailure
  );

  if (written.length === 0) {
    return null;
  }

  yield* setSavedThemes(command, {
    activeId: null,
    candidates: drafts.map((draft) => toStoredTheme(draft)),
  });

  const look: StarterLook = {
    chosen: first.name,
    options: drafts.map((draft) => draft.name),
    written,
  };

  return look;
});

export { createStarterLook, createStarterVersion, isStarterProject };

export type { StarterLook, StarterLookCommand };
