import type { RunLevel } from "@design-studio/contracts";
import { lazy } from "react";

import type { AppChip } from "./app-chip-model.js";
import type { ContinueCard } from "./continue-card.js";
import type { ComposerFoot } from "./home-extras.js";
import type { FilterChips } from "./home-library.js";
import type { PackCards } from "./home-popovers.js";
import type { HomeSlashMenu } from "./home-slash.js";
import type { HomeTemplateGrid } from "./home-templates.js";
import type { FILTER_EMPTY, listFilteredLibrary } from "./library-model.js";
import type { ProjectGrid } from "./project-grid.js";

interface LibraryModule {
  readonly ContinueCard: typeof ContinueCard;
  readonly FILTER_EMPTY: typeof FILTER_EMPTY;
  readonly FilterChips: typeof FilterChips;
  readonly PackCards: typeof PackCards;
  readonly ProjectGrid: typeof ProjectGrid;
  readonly listFilteredLibrary: typeof listFilteredLibrary;
}

interface TemplatesModule {
  readonly HomeTemplateGrid: typeof HomeTemplateGrid;
}

interface ExtrasModule {
  readonly ComposerFoot: typeof ComposerFoot;
}

interface SlashModule {
  readonly HomeSlashMenu: typeof HomeSlashMenu;
}

interface ChipRunInput {
  readonly images: File[];
  readonly level: RunLevel;
  readonly prompt: string;
  readonly referenceUrls: string[];
}

interface AppMenuModule {
  readonly openChip: (chip: AppChip, tokensOnly: boolean) => Promise<string>;
  readonly runInProject: (
    projectId: string,
    input: ChipRunInput
  ) => Promise<void>;
}

const importTrash = async (): Promise<void> => {
  await import("./home-trash.js");
};

const importPopovers = async (): Promise<void> => {
  await import("./home-popovers.js");
};

const importSlash = async (): Promise<SlashModule> => {
  const loaded = await import("./home-slash.js");

  return { HomeSlashMenu: loaded.HomeSlashMenu };
};

const importTemplates = async (): Promise<TemplatesModule> => {
  const loaded = await import("./home-templates.js");

  return { HomeTemplateGrid: loaded.HomeTemplateGrid };
};

const importExtras = async (): Promise<ExtrasModule> => {
  const loaded = await import("./home-extras.js");

  return { ComposerFoot: loaded.ComposerFoot };
};

const importAppMenu = async (): Promise<AppMenuModule> => {
  const loaded = await import("./use-app-attach.js");

  return { openChip: loaded.openChip, runInProject: loaded.runInProject };
};

const importLibrary = async (): Promise<LibraryModule> => {
  const [card, grid, models, filters, popovers] = await Promise.all([
    import("./continue-card.js"),
    import("./project-grid.js"),
    import("./library-model.js"),
    import("./home-library.js"),
    import("./home-popovers.js"),
  ]);

  return {
    ContinueCard: card.ContinueCard,
    FILTER_EMPTY: models.FILTER_EMPTY,
    FilterChips: filters.FilterChips,
    PackCards: popovers.PackCards,
    ProjectGrid: grid.ProjectGrid,
    listFilteredLibrary: models.listFilteredLibrary,
  };
};

const HomeTrash = lazy(async () => {
  const loaded = await import("./home-trash.js");

  return { default: loaded.HomeTrash };
});

const PlusMenu = lazy(async () => {
  const loaded = await import("./plus-menu.js");

  return { default: loaded.PlusMenu };
});

const PackPopover = lazy(async () => {
  const loaded = await import("./home-popovers.js");

  return { default: loaded.PackPopover };
});

const ModelPopover = lazy(async () => {
  const loaded = await import("./home-popovers.js");

  return { default: loaded.ModelPopover };
});

const LevelPopover = lazy(async () => {
  const loaded = await import("./home-popovers.js");

  return { default: loaded.LevelPopover };
});

const AppMenu = lazy(async () => {
  const loaded = await import("./app-menu.js");

  return { default: loaded.AppMenu };
});

const FolderPathPop = lazy(async () => {
  const loaded = await import("./folder-path-pop.js");

  return { default: loaded.FolderPathPop };
});

const HomeDoctor = lazy(async () => {
  const loaded = await import("./home-doctor.js");

  return { default: loaded.HomeDoctor };
});

const HomeEmpty = lazy(async () => {
  const loaded = await import("./home-empty.js");

  return { default: loaded.HomeEmpty };
});

export {
  AppMenu,
  FolderPathPop,
  HomeDoctor,
  HomeEmpty,
  HomeTrash,
  LevelPopover,
  ModelPopover,
  PackPopover,
  PlusMenu,
  importAppMenu as loadAppMenu,
  importExtras as loadExtras,
  importLibrary as loadLibrary,
  importPopovers as loadPops,
  importSlash as loadSlash,
  importTemplates as loadTemplates,
  importTrash as loadTrash,
};

export type {
  AppMenuModule,
  ExtrasModule,
  LibraryModule,
  SlashModule,
  TemplatesModule,
};
