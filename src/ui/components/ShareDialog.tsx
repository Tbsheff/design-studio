import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SHARE_DEFAULT_EXPIRY_HOURS, SHARE_MAX_FRAMES, shareUrl, type ShareExpiryHours, type ShareLink, type ShareServerState } from '../../shared/share';
import { errorText } from '../api';
import { canvasFrameChoices } from '../exportApi';
import { shareApi } from '../shareApi';
import { useModalDialog } from '../usePopover';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';
import '../styles/export.css';
import '../styles/share.css';

export interface ShareTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
}

const EXPIRIES: { id: ShareExpiryHours; label: string }[] = [
  { id: 1, label: '1 hour' },
  { id: 24, label: '24 hours' },
  { id: 168, label: '7 days' },
];

const sessionTokens = new Map<string, string>();

function endsText(link: ShareLink, now: number): string {
  if (link.revokedAt !== null) return 'Turned off';
  const left = link.expiresAt - now;
  if (left <= 0) return 'Ended';
  const hours = Math.round(left / 3600_000);
  if (hours >= 48) return `Ends in ${Math.round(hours / 24)} days`;
  if (hours >= 1) return `Ends in ${hours} h`;
  return `Ends in ${Math.max(1, Math.round(left / 60_000))} min`;
}

function LinkUrls({ token, server }: { token: string; server: ShareServerState }) {
  const local = server.localUrl ? shareUrl(server.localUrl, token) : null;
  const lan = server.lanUrl ? shareUrl(server.lanUrl, token) : null;
  return (
    <div className="share-urls">
      {local && (
        <div className="share-url">
          <span className="share-url-kind">This computer</span>
          <code className="mono truncate">{local}</code>
          <CopyButton text={local} label="Copy link" />
        </div>
      )}
      {lan && (
        <div className="share-url">
          <span className="share-url-kind">Local network</span>
          <code className="mono truncate">{lan}</code>
          <CopyButton text={lan} label="Copy link" />
        </div>
      )}
    </div>
  );
}

function LinkRow({ link, server, now, onRevoke, busy }: { link: ShareLink; server: ShareServerState; now: number; onRevoke: (id: string) => void; busy: boolean }) {
  const token = sessionTokens.get(link.id);
  return (
    <li className={`share-link${link.active ? '' : ' off'}`} data-testid="share-link">
      <div className="share-link-head">
        <span className="share-link-title truncate">{link.title}</span>
        <span className="share-link-meta">
          {link.frames.length} frame{link.frames.length === 1 ? '' : 's'} · {link.comments} comment{link.comments === 1 ? '' : 's'} · {endsText(link, now)}
        </span>
        {link.active && (
          <button type="button" className="btn ghost small" disabled={busy} onClick={() => onRevoke(link.id)} data-tip="The link stops working at once and its images are deleted">
            Revoke
          </button>
        )}
      </div>
      {link.active && token && <LinkUrls token={token} server={server} />}
      {link.active && !token && <p className="share-link-note">The link was shown when it was made. Make a new link to copy it again.</p>}
    </li>
  );
}

function LanSwitch({ server, hasLive, busy, onChange }: { server: ShareServerState; hasLive: boolean; busy: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="share-lan">
      <div className="share-lan-row">
        <div className="share-lan-text">
          <span className="share-lan-title">Allow on local network</span>
          <span className="share-lan-help">Off: only this computer can open links (127.0.0.1).</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={server.lan}
          aria-label="Allow on local network"
          className={`export-switch${server.lan ? ' on' : ''}`}
          disabled={busy || (!hasLive && !server.lan)}
          data-tip={hasLive ? undefined : 'Make a link first'}
          onClick={() => onChange(!server.lan)}
        >
          <span className="export-switch-knob" />
        </button>
      </div>
      {server.lan && (
        <div className="alert warn small" role="alert">
          Anyone on this network who has a link can open it and comment. Use this only on networks you trust, and turn it off when the review ends.
        </div>
      )}
    </div>
  );
}

function useShares(projectId: string) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [server, setServer] = useState<ShareServerState>({ running: false, lan: false, localUrl: null, lanUrl: null });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    const list = await shareApi.list(projectId);
    setLinks(list.links);
    setServer(list.server);
  }, [projectId]);
  useEffect(() => {
    reload().catch((err: unknown) => setError(errorText(err)));
  }, [reload]);
  const act = useCallback(
    async (task: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await task();
        await reload();
      } catch (err) {
        setError(errorText(err));
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );
  return { links, server, error, busy, act };
}

function ExpiryPicker({ value, onChange }: { value: ShareExpiryHours; onChange: (v: ShareExpiryHours) => void }) {
  return (
    <div className="segmented export-seg" role="radiogroup" aria-label="Link ends after">
      {EXPIRIES.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={value === option.id} className={value === option.id ? 'on' : ''} onClick={() => onChange(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function ShareDialog({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const dialog = useModalDialog(onClose);
  const frames = useMemo(() => canvasFrameChoices(target.projectId, target.directionId), [target.projectId, target.directionId]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(frames.slice(0, SHARE_MAX_FRAMES).map((f) => f.id)));
  const [expiry, setExpiry] = useState<ShareExpiryHours>(SHARE_DEFAULT_EXPIRY_HOURS);
  const shares = useShares(target.projectId);
  const now = Date.now();
  const chosen = frames.filter((f) => picked.has(f.id)).map((f) => f.frame);
  const live = shares.links.filter((l) => l.active);
  const shown = [...live, ...shares.links.filter((l) => !l.active).slice(0, 3)];
  const versionId = target.versionId;
  const canCreate = Boolean(versionId) && chosen.length > 0 && chosen.length <= SHARE_MAX_FRAMES && !shares.busy;

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate || !versionId) return;
    void shares.act(async () => {
      const made = await shareApi.create(target.projectId, { directionId: target.directionId, versionId, frames: chosen, expiresInHours: expiry });
      sessionTokens.set(made.link.id, made.token);
    });
  };

  return (
    <dialog ref={dialog.ref} className="modal share-dialog" aria-label="Share a read-only link" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Share a read-only link</h2>
            <p>Viewers see still images of the frames and can comment. They cannot edit, run the app or reach the studio.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body share-body">
          <fieldset className="export-field export-frames">
            <legend className="export-label">Frames</legend>
            {frames.map((choice) => (
              <label key={choice.id} className="export-frame">
                <input type="checkbox" checked={picked.has(choice.id)} onChange={() => toggle(choice.id)} />
                <span className="export-frame-name">{choice.frame.name}</span>
                {choice.frame.path ? <span className="export-frame-path truncate">/{choice.frame.path}</span> : null}
                <span className="export-frame-size">
                  {choice.frame.width} × {choice.frame.height}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="export-field">
            <span className="export-label">Link ends after</span>
            <ExpiryPicker value={expiry} onChange={setExpiry} />
          </div>
          {!versionId && <p className="share-link-note">Save a version first. A link shares a saved version.</p>}
          {shares.error && (
            <div className="alert error small" role="alert">
              {shares.error}
            </div>
          )}
          {shown.length > 0 && (
            <ul className="share-links" aria-label="Share links">
              {shown.map((link) => (
                <LinkRow key={link.id} link={link} server={shares.server} now={now} busy={shares.busy} onRevoke={(id) => void shares.act(() => shareApi.revoke(target.projectId, id))} />
              ))}
            </ul>
          )}
          <LanSwitch server={shares.server} hasLive={live.length > 0} busy={shares.busy} onChange={(on) => void shares.act(() => shareApi.setLan(on))} />
        </div>
        <div className="modal-foot">
          <span className="share-foot-note">No upload and no tunnel. Links serve from this computer while Design Studio is open.</span>
          <span className="share-spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn primary" disabled={!canCreate}>
            {shares.busy ? 'Working…' : 'Create link'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
