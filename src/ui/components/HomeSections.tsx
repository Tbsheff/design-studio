import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { thumbnailPending } from '../projectList';
import type { Project, Starter } from '../../shared/contracts';
import type { CardActions } from './ProjectGrid';
import { api, errorText } from '../api';
import { Icon } from './Icon';

const STARTER_IMAGES: Record<string, string> = {
  landing: new URL('../assets/starters/landing.png', import.meta.url).href,
  dashboard: new URL('../assets/starters/dashboard.png', import.meta.url).href,
  'mobile-app': new URL('../assets/starters/mobile-app.png', import.meta.url).href,
  deck: new URL('../assets/starters/deck.png', import.meta.url).href,
  form: new URL('../assets/starters/form.png', import.meta.url).href,
  docs: new URL('../assets/starters/docs.png', import.meta.url).href,
};

export function StarterGallery({ disabled, onPick }: { disabled: boolean; onPick: (starter: Starter) => Promise<void> }) {
  const [starters, setStarters] = useState<Starter[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    api
      .starters()
      .then(setStarters)
      .catch(() => setStarters([]));
  }, []);
  if (starters !== null && starters.length === 0) return null;
  const pick = async (starter: Starter) => {
    setBusy(starter.id);
    try {
      await onPick(starter);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="home-starters" id="home-starters" aria-labelledby="starters-heading">
      <div className="home-list-head">
        <h2 id="starters-heading">Start from a starter</h2>
        <span className="home-section-hint">Opens at once, no agent run</span>
      </div>
      <ul className="starter-grid">
        {(starters ?? []).map((starter) => (
          <li key={starter.id}>
            <button type="button" className="starter-card" data-starter-id={starter.id} disabled={disabled || busy !== null} aria-busy={busy === starter.id} onClick={() => void pick(starter)}>
              <span className="starter-thumb">
                <img src={STARTER_IMAGES[starter.id]} alt="" width={640} height={400} loading="lazy" draggable={false} />
                {busy === starter.id && <span className="spinner" />}
              </span>
              <span className="starter-name">{starter.name}</span>
              <span className="starter-desc">{starter.description}</span>
            </button>
          </li>
        ))}
        {starters === null && [0, 1, 2, 3, 4, 5].map((index) => <li key={index} className="starter-card skeleton" aria-hidden="true" />)}
      </ul>
    </section>
  );
}

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

export function FirstRunPanel({ onClose, onSample }: { onClose: () => void; onSample: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sample = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSample();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <section className="first-run" aria-labelledby="first-run-heading">
      <div className="first-run-head">
        <h2 id="first-run-heading">New here? Three steps to a first design</h2>
        <button type="button" className="icon-btn" aria-label="Close getting started" title="Close" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <ol className="first-run-steps">
        <li>
          <span className="first-run-num" aria-hidden="true">1</span>
          <span className="first-run-text">
            <strong>Pick a starter</strong>
            <span>It opens at once and costs nothing. Or describe a page above.</span>
          </span>
        </li>
        <li>
          <span className="first-run-num" aria-hidden="true">2</span>
          <span className="first-run-text">
            <strong>Try a direct edit</strong>
            <span>Press Select, click a heading and change its text or color in the inspector.</span>
          </span>
        </li>
        <li>
          <span className="first-run-num" aria-hidden="true">3</span>
          <span className="first-run-text">
            <strong>Make a version</strong>
            <span>Each edit and agent run saves a version. Open Versions to compare or restore.</span>
          </span>
        </li>
      </ol>
      <div className="first-run-foot">
        <button type="button" className="btn small has-icon" disabled={busy} onClick={() => void sample()}>
          {busy ? <span className="spinner" /> : <Icon name="sparkle" size={14} />}
          {busy ? 'Opening…' : 'Open the sample project'}
        </button>
        <span className="first-run-hint">A finished page with 2 versions to explore.</span>
        {error && (
          <span className="first-run-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}

export interface HomeToastState {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
  error?: boolean;
}

const TOAST_MS = 8000;

export function HomeToast({ toast, onDone }: { toast: HomeToastState | null; onDone: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDone, TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast, onDone]);
  return (
    <div className="ds-toast-slot" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`ds-toast home-toast${toast.error ? ' error' : ''}`}>
          <span className="truncate">{toast.text}</span>
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

  const watching = projects?.some((project) => thumbnailPending(project) || Date.now() - project.updatedAt < RECENT_MS) ?? false;
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadProjects();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [watching, loadProjects]);

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
