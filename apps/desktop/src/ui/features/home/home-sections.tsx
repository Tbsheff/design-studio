import type { Project } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";

import { api, errorText } from "../../api.js";
import { copy } from "./copy.js";
import type { CardActions } from "./project-card-model.js";
import { projectsApi, useProjects } from "./projects-store-model.js";

const useOnboarding = (): {
  readonly shouldShow: boolean;
  readonly dismiss: () => void;
} => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const state = await api.onboarding();
        setShow(!state.dismissed);
      } catch {
        setShow(false);
      }
    };

    load();
  }, []);

  const dismiss = (): void => {
    setShow(false);

    const send = async (): Promise<void> => {
      try {
        await api.dismissOnboarding();
      } catch {
        setShow(false);
      }
    };

    send();
  };

  return { dismiss, shouldShow: show };
};

interface HomeToastState {
  readonly id: number;
  readonly text: string;
  readonly action?: { readonly label: string; readonly run: () => void };
  readonly more?: { readonly label: string; readonly run: () => void };
  readonly hasError: boolean;
}

const TOAST_MS = 8000;

const HomeToast = ({
  toast,
  onDone,
}: {
  readonly toast: HomeToastState | null;
  readonly onDone: () => void;
}): ReactElement => {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!toast || held || toast.action || toast.hasError) {
      return;
    }

    const timer = globalThis.setTimeout(onDone, TOAST_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [toast, held, onDone]);

  return (
    <div className="ds-toast-slot" role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className={`ds-toast home-toast${toast.hasError ? " error" : ""}`}
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <span className="home-toast-text">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="btn small"
              onClick={() => {
                toast.action?.run();
                onDone();
              }}
            >
              {toast.action.label}
            </button>
          )}
          {toast.more && (
            <button
              type="button"
              className="btn small"
              onClick={() => {
                toast.more?.run();
                onDone();
              }}
            >
              {toast.more.label}
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={copy.dismiss}
            onClick={onDone}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

interface ActionDeps {
  readonly onOpen: (project: Project) => void;
  readonly showToast: (toast: Omit<HomeToastState, "id">) => void;
  readonly onOpenTrash: () => void;
  readonly homeDir: string | null;
}

const getRemovedText = (project: Project, homeDir: string | null): string => {
  const folder = project.imported?.sourcePath;

  if (!folder || project.imported?.created) {
    return `Moved “${project.name}” to Trash`;
  }

  return `Removed “${project.name}” from Design Studio. Its files stay in ${shortenHome(folder.replace(/^\/private(?=\/)/u, ""), homeDir)}.`;
};

const useProjectActions = ({
  onOpen,
  showToast,
  onOpenTrash,
  homeDir,
}: ActionDeps): CardActions => ({
  onDelete: async (project) => {
    try {
      const trashed = await projectsApi.trash(project);

      const undo = async (): Promise<void> => {
        try {
          await projectsApi.restore(trashed.trashId);
        } catch (error: unknown) {
          showToast({
            hasError: true,
            text: `Could not restore: ${errorText(error)}`,
          });
        }
      };

      showToast({
        action: { label: "Undo", run: undo },
        hasError: false,
        more: { label: "Open Trash", run: onOpenTrash },
        text: getRemovedText(project, homeDir),
      });
    } catch (error) {
      showToast({
        hasError: true,
        text: `Could not move to Trash: ${errorText(error)}`,
      });
    }
  },
  onDuplicate: async (project) => {
    try {
      const duplicate = await projectsApi.duplicate(project);
      showToast({
        action: { label: "Open", run: () => onOpen(duplicate) },
        hasError: false,
        text: `Duplicated as “${duplicate.name}”`,
      });
    } catch (error) {
      showToast({
        hasError: true,
        text: `Could not duplicate: ${errorText(error)}`,
      });
    }
  },
  onOpen,
  onRename: async (project, name) => {
    try {
      await projectsApi.rename(project, name);
    } catch (error: unknown) {
      showToast({
        hasError: true,
        text: `Could not rename: ${errorText(error)}`,
      });
    }
  },
  onReveal: async (project) => {
    try {
      await projectsApi.reveal(project);
    } catch (error: unknown) {
      showToast({
        hasError: true,
        text: `Could not show the folder: ${errorText(error)}`,
      });
    }
  },
});

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const useHomeProjects = () => {
  const {
    projects,
    error: listError,
    reload: loadProjects,
  } = useProjects({ shouldWatch: true });

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditable(event.target)
      ) {
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

export { HomeToast, useHomeProjects, useOnboarding, useProjectActions };

export type { HomeToastState };
