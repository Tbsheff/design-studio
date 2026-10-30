import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { errorText } from './api';
import { Home } from './components/Home';
import { CommandLayer, DesignSystems, NewDesignSystem, prefetchStudio, Studio } from './screens';
import type { CommandLayer as Layer } from './commands/registry';
import { isTypingTarget } from './typingTarget';
import { loadSession } from './session';
import { uiStore, useUi } from './storage';
import { installRouting } from './route';

installRouting();
if (uiStore.get().activeProjectId) void prefetchStudio();

class ScreenBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: errorText(error) };
  }

  render() {
    if (this.state.error === null) return this.props.children;
    return (
      <div className="boot">
        <div className="boot-card" role="alert">
          <h1>This screen did not load</h1>
          <p className="muted">{this.state.error}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}

const LAYER_EVENT = 'studio:command-layer';
const DesktopApp = 'studioDesktop' in window ? lazy(() => import('./DesktopApp')) : null;
const McpToasts = lazy(() => import('./components/McpToasts'));

function useCommandLayer() {
  const [layer, setLayer] = useState<Layer | null>(null);
  useEffect(() => {
    const toggle = (next: unknown) => (next === 'palette' || next === 'shortcuts') && setLayer((cur) => (cur === next ? null : next));
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const next = mod && !e.altKey && !e.shiftKey && e.code === 'KeyK' ? 'palette' : e.key === '?' && !e.metaKey && !e.altKey && (e.ctrlKey || !isTypingTarget(e.target)) ? 'shortcuts' : null;
      if (!next || e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      toggle(next);
    };
    const onOpen = (e: Event) => toggle((e as CustomEvent<unknown>).detail);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener(LAYER_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener(LAYER_EVENT, onOpen);
    };
  }, []);
  return (
    layer && (
      <Suspense fallback={null}>
        <CommandLayer layer={layer} onLayer={setLayer} />
      </Suspense>
    )
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <ScreenBoundary>
      <Suspense fallback={<div className="boot muted">Loading project…</div>}>{children}</Suspense>
    </ScreenBoundary>
  );
}

export function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ui = useUi();
  const layer = useCommandLayer();

  useEffect(() => {
    loadSession()
      .then(() => setReady(true))
      .catch((err) => setError(errorText(err)));
  }, []);

  if (error) {
    return (
      <div className="boot">
        <div className="boot-card">
          <h1>Cannot connect to the studio server</h1>
          <p className="muted">{error}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!ready) return <div className="boot muted">Connecting…</div>;
  const notice = (
    <>
      {layer}
      <Suspense fallback={null}>
        <McpToasts />
      </Suspense>
      {DesktopApp && (
        <Suspense fallback={null}>
          <DesktopApp activeProjectId={ui.activeProjectId} />
        </Suspense>
      )}
    </>
  );
  if (ui.activeProjectId) {
    return (
      <>
        {notice}
        <Screen>
          <Studio
            key={ui.activeProjectId}
            projectId={ui.activeProjectId}
            onExit={() => uiStore.set({ activeProjectId: null })}
          />
        </Screen>
      </>
    );
  }
  if (ui.screen === 'new-design-system') {
    return (
      <>
        {notice}
        <Screen>
          <NewDesignSystem
            onCancel={() => uiStore.set({ screen: ui.returnTo, returnTo: 'home' })}
            onCreated={(id) => uiStore.set({ activeProjectId: id, screen: 'home', returnTo: 'home', libraryFrom: null })}
          />
        </Screen>
      </>
    );
  }
  if (ui.screen === 'design-systems') {
    return (
      <>
        {notice}
        <Screen>
          <DesignSystems from={ui.libraryFrom} />
        </Screen>
      </>
    );
  }
  return (
    <>
      {notice}
      <ScreenBoundary>
        <Home onOpen={(id) => void prefetchStudio().then(() => uiStore.set({ activeProjectId: id }))} />
      </ScreenBoundary>
    </>
  );
}
