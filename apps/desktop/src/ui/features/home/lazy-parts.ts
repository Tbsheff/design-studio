import { lazy } from "react";

const clarifyChunk = import("../chat/clarify-form.js");

const ClarifyForm = lazy(() =>
  clarifyChunk.then((m) => ({ default: m.ClarifyForm }))
);

const libraryChunk = import("./home-library.js");

const loadTrash = () => import("./home-trash.js");

const loadSlash = () => import("./home-slash.js");

const HomeTrash = lazy(loadTrash);

const loadPops = () => import("./home-popovers.js");

const PlusMenu = lazy(() => loadPops().then((m) => ({ default: m.PlusMenu })));

const PackPopover = lazy(() =>
  loadPops().then((m) => ({ default: m.PackPopover }))
);

const ModelPopover = lazy(() =>
  loadPops().then((m) => ({ default: m.ModelPopover }))
);

const LevelPopover = lazy(() =>
  loadPops().then((m) => ({ default: m.LevelPopover }))
);

const loadTemplates = () => import("./home-templates.js");

const loadExtras = () => import("./home-extras.js");

const loadAppMenu = () => import("./home-app-menu.js");

const AppMenu = lazy(() => loadAppMenu().then((m) => ({ default: m.AppMenu })));

const FolderPathPop = lazy(() =>
  loadAppMenu().then((m) => ({ default: m.FolderPathPop }))
);

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
