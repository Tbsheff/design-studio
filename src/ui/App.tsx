import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { errorText } from './api';
import { Home } from './components/Home';
import { DesignSystems, NewDesignSystem, prefetchStudio, Studio } from './screens';
import { loadSession } from './session';
import { uiStore, useUi } from './storage';
import { useDesktopApp } from './useDesktopApp';

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
  const desktopError = useDesktopApp(ui.activeProjectId);

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
  const notice = desktopError ? (
    <div className="desktop-notice" role="alert">
      {desktopError}
    </div>
  ) : null;
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
