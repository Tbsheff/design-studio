import { lazy } from "react";

const clarifyChunk = import("../chat/clarify-form.js");

const ClarifyForm = lazy(async () => ({
  default: (await clarifyChunk).ClarifyForm,
}));

const libraryChunk = import("./home-library.js");

const importTrash = () => import("./home-trash.js");

const importSlash = () => import("./home-slash.js");

const HomeTrash = lazy(importTrash);

const importPopovers = () => import("./home-popovers.js");

const PlusMenu = lazy(async () => ({
  default: (await import("./plus-menu.js")).PlusMenu,
}));

const PackPopover = lazy(async () => ({
  default: (await importPopovers()).PackPopover,
}));

const ModelPopover = lazy(async () => ({
  default: (await importPopovers()).ModelPopover,
}));

const LevelPopover = lazy(async () => ({
  default: (await importPopovers()).LevelPopover,
}));

const importTemplates = () => import("./home-templates.js");

const importExtras = () => import("./home-extras.js");

const importAppMenu = () => import("./home-app-menu.js");

const AppMenu = lazy(async () => ({
  default: (await importAppMenu()).AppMenu,
}));

const FolderPathPop = lazy(async () => ({
  default: (await importAppMenu()).FolderPathPop,
}));

const HomeDoctor = lazy(() => import("./home-doctor.js"));

const HomeEmpty = lazy(() => import("./home-empty.js"));

const importLibrary = () => libraryChunk;

type LibraryModule = Awaited<typeof libraryChunk>;

type TemplatesModule = Awaited<ReturnType<typeof importTemplates>>;

export {
  AppMenu,
  ClarifyForm,
  FolderPathPop,
  HomeDoctor,
  HomeEmpty,
  HomeTrash,
  LevelPopover,
  ModelPopover,
  PackPopover,
  PlusMenu,
  clarifyChunk,
  libraryChunk,
  importAppMenu as loadAppMenu,
  importExtras as loadExtras,
  importLibrary as loadLibrary,
  importPopovers as loadPops,
  importSlash as loadSlash,
  importTemplates as loadTemplates,
  importTrash as loadTrash,
};

export type { LibraryModule, TemplatesModule };
