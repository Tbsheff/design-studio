import { useEffect, useState } from 'react';
import { errorText } from './api';
import { Home } from './components/Home';
import { NewDesignSystem } from './components/NewDesignSystem';
import { Studio } from './components/Studio';
import { loadSession } from './session';
import { uiStore, useUi } from './storage';
import { useDesktopApp } from './useDesktopApp';

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
        <Studio
          key={ui.activeProjectId}
          projectId={ui.activeProjectId}
          onExit={() => uiStore.set({ activeProjectId: null })}
        />
      </>
    );
  }
  if (ui.screen === 'new-design-system') {
    return (
      <>
        {notice}
        <NewDesignSystem onCancel={() => uiStore.set({ screen: 'home' })} onCreated={(id) => uiStore.set({ activeProjectId: id, screen: 'home' })} />
      </>
    );
  }
  return (
    <>
      {notice}
      <Home onOpen={(id) => uiStore.set({ activeProjectId: id })} />
    </>
  );
}
