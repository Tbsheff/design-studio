import type {
  ThemeAppliedSchema,
  ThemeBodySchema,
  ThemeCreatedSchema,
  ThemeSchema,
  ThemeSetResultSchema,
} from "./deps.js";

type StoredTheme = typeof ThemeBodySchema.Type;

type ThemeItem = typeof ThemeSchema.Type;

type ThemeCreated = typeof ThemeCreatedSchema.Type;

type ThemeSetResult = typeof ThemeSetResultSchema.Type;

type ThemeApplied = typeof ThemeAppliedSchema.Type;

interface ThemeFile {
  readonly activeId: string | null;
  readonly candidates: readonly StoredTheme[];
}

const EMPTY_FILE: ThemeFile = { activeId: null, candidates: [] };

const toItem = (stored: StoredTheme, activeId: string | null): ThemeItem => ({
  ...stored,
  isActive: stored.id === activeId,
});

export { EMPTY_FILE, toItem };

export type {
  StoredTheme,
  ThemeApplied,
  ThemeCreated,
  ThemeFile,
  ThemeItem,
  ThemeSetResult,
};
