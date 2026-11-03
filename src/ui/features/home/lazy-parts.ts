import { lazy } from "react";

const clarifyChunk = import("../../components/ClarifyForm.js");

const ClarifyForm = lazy(() =>
  clarifyChunk.then((m) => ({ default: m.ClarifyForm }))
);

const libraryChunk = import("./home-library.js");

const loadTrash = () => import("../../components/HomeTrash.js");

const loadSlash = () => import("./home-slash.js");

const HomeTrash = lazy(loadTrash);

const loadPops = () => import("../../components/HomePopovers.js");

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

const loadAppMenu = () => import("../../components/HomeAppMenu.js");

const AppMenu = lazy(() => loadAppMenu().then((m) => ({ default: m.AppMenu })));

const FolderPathPop = lazy(() =>
  loadAppMenu().then((m) => ({ default: m.FolderPathPop }))
);

const HomeDoctor = lazy(() => import("../../components/HomeDoctor.js"));

const HomeEmpty = lazy(() => import("./home-empty.js"));

const loadLibrary = () => libraryChunk;

type LibraryModule = Awaited<typeof libraryChunk>;

type TemplatesModule = Awaited<ReturnType<typeof loadTemplates>>;

export {
  clarifyChunk,
  FolderPathPop,
  libraryChunk,
  loadExtras,
  loadTemplates,
  loadTrash,
  AppMenu,
  loadAppMenu,
  PackPopover,
  ModelPopover,
  loadLibrary,
  PlusMenu,
  loadSlash,
  HomeDoctor,
  LevelPopover,
  ClarifyForm,
  loadPops,
  HomeTrash,
  HomeEmpty,
};

export type { LibraryModule, TemplatesModule };
