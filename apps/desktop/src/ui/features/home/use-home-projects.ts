import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { useProjects } from "./projects-store-model.js";

interface HomeProjects {
  readonly listError: string | null;
  readonly loadProjects: () => Promise<void>;
  readonly projects: ReturnType<typeof useProjects>["projects"];
  readonly searchRef: RefObject<HTMLInputElement | null>;
}

const hasModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const useHomeProjects = (): HomeProjects => {
  const {
    projects,
    error: listError,
    reload: loadProjects,
  } = useProjects({ shouldWatch: true });

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "/" || hasModifier(event) || isEditable(event.target)) {
        return;
      }

      if (!searchRef.current) {
        return;
      }

      event.preventDefault();
      searchRef.current.focus();
    };

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);

  return { listError, loadProjects, projects, searchRef };
};

export { useHomeProjects };

export type { HomeProjects };
