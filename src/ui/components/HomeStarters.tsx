import { useEffect, useState } from 'react';
import type { Starter } from '../../shared/contracts';
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
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .starters()
      .then(setStarters)
      .catch(() => setStarters([]));
  }, []);
  if (starters !== null && starters.length === 0) return null;
  const pick = async (starter: Starter) => {
    setBusy(starter.id);
    setError(null);
    try {
      await onPick(starter);
    } catch (err) {
      setError(`Could not open ${starter.name}: ${errorText(err)}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="home-starters" id="home-starters" aria-labelledby="starters-heading">
      <div className="home-list-head">
        <h2 id="starters-heading">Starters</h2>
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
      {error && (
        <p className="home-section-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
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
    <section className="ui-notice info first-run" aria-label="First steps">
      <Icon name="sparkle" size={16} />
      <p className="first-run-text">
        <strong>New here?</strong> Describe a page or pick a template. Then press Select to edit any element, and open Versions to compare or restore.
        {error && (
          <span className="first-run-error" role="alert">
            {' '}
            {error}
          </span>
        )}
      </p>
      <button type="button" className="btn small first-run-sample" disabled={busy} onClick={() => void sample()}>
        {busy ? 'Opening…' : 'Open the sample'}
      </button>
      <button type="button" className="icon-btn small" aria-label="Close first steps" title="Close" onClick={onClose}>
        <Icon name="close" size={14} />
      </button>
    </section>
  );
}
