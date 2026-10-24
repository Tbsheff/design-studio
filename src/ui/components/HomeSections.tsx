import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { thumbnailPending } from '../projectList';
import type { Project, Starter } from '../../shared/contracts';
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
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onDone}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

interface ActionDeps {
  onOpen: (projectId: string) => void;
  setProjects: Dispatch<SetStateAction<Project[] | null>>;
  loadProjects: () => Promise<void>;
  showToast: (toast: Omit<HomeToastState, 'id'>) => void;
}

export function useProjectActions({ onOpen, setProjects, loadProjects, showToast }: ActionDeps): CardActions {
  return {
    onOpen: (project) => onOpen(project.id),
    onRename: async (project, name) => {
      setProjects((list) => list?.map((item) => (item.id === project.id ? { ...item, name } : item)) ?? list);
      try {
        await api.renameProject(project.id, name);
      } catch (err) {
        showToast({ text: `Could not rename: ${errorText(err)}`, error: true });
      }
      void loadProjects();
    },
    onDuplicate: async (project) => {
      try {
        const { project: copy } = await api.duplicateProject(project.id);
        await loadProjects();
        showToast({ text: `Duplicated as “${copy.name}”`, action: { label: 'Open', run: () => onOpen(copy.id) } });
      } catch (err) {
        showToast({ text: `Could not duplicate: ${errorText(err)}`, error: true });
      }
    },
    onDelete: async (project) => {
      setProjects((list) => list?.filter((item) => item.id !== project.id) ?? list);
      try {
        const trashed = await api.trashProject(project.id);
        showToast({
          text: `Deleted “${project.name}”. Its files stay on disk.`,
          action: {
            label: 'Undo',
            run: () => {
              void api
                .restoreProject(trashed.trashId)
                .then(() => loadProjects())
                .catch((err: unknown) => showToast({ text: `Could not restore: ${errorText(err)}`, error: true }));
            },
          },
        });
      } catch (err) {
        showToast({ text: `Could not delete: ${errorText(err)}`, error: true });
      }
      void loadProjects();
    },
  };
}

const POLL_FAST_MS = 500;
const POLL_MS = 1500;
const RECENT_MS = 120_000;

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

export function useHomeProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadProjects = useCallback(
    () =>
      api
        .listProjects()
        .then((list) => {
          setListError(null);
          setProjects(list);
        })
        .catch((err) => setListError(errorText(err))),
    [],
  );

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const lagging = projects?.some(thumbnailPending) ?? false;
  const watching = lagging || (projects?.some((project) => Date.now() - project.updatedAt < RECENT_MS) ?? false);
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadProjects();
    }, lagging ? POLL_FAST_MS : POLL_MS);
    return () => window.clearInterval(timer);
  }, [watching, lagging, loadProjects]);

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
  return { projects, setProjects, listError, loadProjects, searchRef };
}
