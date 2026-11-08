import { lazy } from "react";

const clarifyChunk = import("../chat/clarify-form.js");

const ClarifyForm = lazy(async () => ({
  default: (await clarifyChunk).ClarifyForm,
}));

const libraryChunk = import("./home-library.js");

const loadTrash = () => import("./home-trash.js");

const loadSlash = () => import("./home-slash.js");

const HomeTrash = lazy(loadTrash);

const loadPops = () => import("./home-popovers.js");

const PlusMenu = lazy(async () => ({ default: (await loadPops()).PlusMenu }));

const PackPopover = lazy(async () => ({
  default: (await loadPops()).PackPopover,
}));

const ModelPopover = lazy(async () => ({
  default: (await loadPops()).ModelPopover,
}));

const LevelPopover = lazy(async () => ({
  default: (await loadPops()).LevelPopover,
}));

const loadTemplates = () => import("./home-templates.js");

const loadExtras = () => import("./home-extras.js");

const loadAppMenu = () => import("./home-app-menu.js");

const AppMenu = lazy(async () => ({ default: (await loadAppMenu()).AppMenu }));

const FolderPathPop = lazy(async () => ({
  default: (await loadAppMenu()).FolderPathPop,
}));

const HomeDoctor = lazy(() => import("./home-doctor.js"));

const HomeEmpty = lazy(() => import("./home-empty.js"));

const loadLibrary = () => libraryChunk;

type LibraryModule = Awaited<typeof libraryChunk>;

type TemplatesModule = Awaited<ReturnType<typeof loadTemplates>>;

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
  loadAppMenu,
  loadExtras,
  loadLibrary,
  loadPops,
  loadSlash,
  loadTemplates,
  loadTrash,
};

export type { LibraryModule, TemplatesModule };
