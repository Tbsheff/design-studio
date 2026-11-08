import { uiStore } from "./storage";

const PROJECT_PATH = /^\/p\/([^/]+)\/?$/;

export function projectFromPath(pathname: string): string | null {
  const match = PROJECT_PATH.exec(pathname);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function pathForProject(projectId: string | null): string {
  return projectId ? `/p/${encodeURIComponent(projectId)}` : "/";
}

let installed = false;
let leaveCheck: (() => boolean) | null = null;

export function setLeaveCheck(check: (() => boolean) | null): void {
  leaveCheck = check;
}

export function installRouting(): void {
  if (installed) {
    return;
  }

  installed = true;
  let current = projectFromPath(globalThis.location.pathname);
  const canonical = pathForProject(current);

  if (globalThis.location.pathname !== canonical) {
    globalThis.history.replaceState(
      null,
      "",
      `${canonical}${globalThis.location.search}${globalThis.location.hash}`
    );
  }

  if (uiStore.get().activeProjectId !== current) {
    uiStore.set({ activeProjectId: current });
  }

  if (current === null && uiStore.get().screen !== "home") {
    uiStore.set({ screen: "home" });
  }

  uiStore.subscribe(() => {
    const next = uiStore.get().activeProjectId;

    if (next === current) {
      return;
    }

    current = next;
    globalThis.history.pushState(null, "", pathForProject(next));
  });
  globalThis.addEventListener("popstate", () => {
    const next = projectFromPath(globalThis.location.pathname);

    if (current !== null && next !== current && leaveCheck && !leaveCheck()) {
      globalThis.history.pushState(null, "", pathForProject(current));

      return;
    }

    current = next;

    if (uiStore.get().activeProjectId !== next) {
      uiStore.set({ activeProjectId: next });
    }
  });
}
