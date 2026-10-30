import { useEffect, useRef, useState } from 'react';
import type { Project } from '../../shared/contracts';
import { projectsApi, useProjects } from '../projectsStore';
import { shortenHome } from '../../shared/folders';
import type { CardActions } from './ProjectGrid';
import { api, errorText } from '../api';
import { Icon } from './Icon';

export function useOnboarding(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);
  useEffect(() => {
    api
      .onboarding()
      .then((state) => setShow(!state.dismissed))
      .catch(() => setShow(false));
  }, []);
  const dismiss = () => {
    setShow(false);
    void api.dismissOnboarding().catch(() => undefined);
  };
  return { show, dismiss };
}

export interface HomeToastState {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  more?: { label: string; run: () => void };
  error?: boolean;
}

const TOAST_MS = 8000;

export function HomeToast({ toast, onDone }: { toast: HomeToastState | null; onDone: () => void }) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!toast || held || toast.action || toast.error) return;
    const timer = window.setTimeout(onDone, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, held, onDone]);
  return (
    <div className="ds-toast-slot" role="status" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className={`ds-toast home-toast${toast.error ? ' error' : ''}`}
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
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onDone}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

interface ActionDeps {
  onOpen: (project: Project) => void;
  showToast: (toast: Omit<HomeToastState, 'id'>) => void;
  onOpenTrash: () => void;
  homeDir: string | null;
}

function removedText(project: Project, homeDir: string | null): string {
  const folder = project.imported?.sourcePath;
  if (!folder || project.imported?.created) return `Moved “${project.name}” to Trash`;
  return `Removed “${project.name}” from Design Studio. Its files stay in ${shortenHome(folder.replace(/^\/private(?=\/)/, ''), homeDir)}.`;
}

export function useProjectActions({ onOpen, showToast, onOpenTrash, homeDir }: ActionDeps): CardActions {
  return {
    onOpen,
    onRename: async (project, name) => {
      await projectsApi.rename(project, name).catch((err: unknown) => showToast({ text: `Could not rename: ${errorText(err)}`, error: true }));
    },
    onDuplicate: async (project) => {
      try {
        const copy = await projectsApi.duplicate(project);
        showToast({ text: `Duplicated as “${copy.name}”`, action: { label: 'Open', run: () => onOpen(copy) } });
      } catch (err) {
        showToast({ text: `Could not duplicate: ${errorText(err)}`, error: true });
      }
    },
    onReveal: (project) => {
      void projectsApi.reveal(project).catch((err: unknown) => showToast({ text: `Could not show the folder: ${errorText(err)}`, error: true }));
    },
    onDelete: async (project) => {
      try {
        const trashed = await projectsApi.trash(project);
        const undo = () => void projectsApi.restore(trashed.trashId).catch((err: unknown) => showToast({ text: `Could not restore: ${errorText(err)}`, error: true }));
        showToast({ text: removedText(project, homeDir), action: { label: 'Undo', run: undo }, more: { label: 'Open Trash', run: onOpenTrash } });
      } catch (err) {
        showToast({ text: `Could not move to Trash: ${errorText(err)}`, error: true });
      }
    },
  };
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function useHomeProjects() {
  const { projects, error: listError, reload: loadProjects } = useProjects({ watch: true });
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      if (!searchRef.current) return;
      event.preventDefault();
      searchRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { projects, listError, loadProjects, searchRef };
}
