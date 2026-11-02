export {
  installCommand,
  installDetail,
  projectHealth,
  viteNeedsInstall,
} from "./app-health.js";

export {
  cleanAppDir,
  detectApp,
  frameworkOf,
  readPackage,
  workspaceGlobs,
} from "./detect.js";

export type { AppDetection } from "./detect.js";

export { AppServers, missingNextMessage, nextBinary } from "./dev-server.js";

export type { AppServerDeps } from "./dev-server.js";

export { DevServerPids } from "./dev-server-pids.js";

export type { DevServerRecord } from "./dev-server-pids.js";

export {
  diagnose,
  exampleValues,
  missingEnvKeys,
  probeRoot,
  sameDoctor,
} from "./doctor.js";

export type { DoctorInput, DoctorProbe, SkipFlag } from "./doctor.js";

export {
  attachReadiness,
  estimateFirstVersionMs,
  firstVersionBlock,
  firstVersionState,
  firstVersionWaitText,
  isFirstVersionRunning,
  startFirstVersion,
  waitForFirstVersion,
} from "./first-version.js";

export type { AttachResponse } from "./first-version.js";

export { findApps } from "./found-apps.js";

export {
  captureCookies,
  frameStatesView,
  hasSessionCookie,
  resolveFrameState,
  setFrameSession,
  setFrameState,
  stateOfFrame,
} from "./frame-state.js";

export type {
  FrameStateChange,
  JarCookie,
  ResolvedFrameState,
  SessionChange,
} from "./frame-state.js";

export {
  answerState,
  captureSessionCookies,
  isDataPath,
  sendEmptied,
  sessionCookieNames,
  wantsEmpty,
  withStateHeaders,
} from "./frame-state-proxy.js";

export type { ActiveFrameState } from "./frame-state-proxy.js";

export { installHint } from "./install-hint.js";

export type { InstallHint, PackageManager } from "./install-hint.js";

export { createAppProxy, projectIdFromHost } from "./proxy.js";

export type { AppProxy, AppProxyOptions, AppTarget } from "./proxy.js";

export { appRouterDir, listAppRoutes, matchRouteFile } from "./routes.js";

export {
  parseStack,
  resolveStackSources,
  sourcesShifted,
  workTreeRelative,
} from "./source-map.js";

export type { SourceTarget } from "./source-map.js";

export { buildCommand, findWorkspacePackage } from "./workspace-package.js";

export type { WorkspacePackage } from "./workspace-package.js";

export {
  findWorkspaceRoot,
  hasWorkspaceMarker,
  nextAppWorkspace,
} from "./workspace-root.js";

export type { WorkspaceRoot } from "./workspace-root.js";
