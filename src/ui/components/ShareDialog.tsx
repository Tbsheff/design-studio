import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { SHARE_DEFAULT_EXPIRY_HOURS, SHARE_MAX_FRAMES, shareUrl, type ShareExpiryHours, type ShareLink, type ShareServerState } from '../../shared/share';
import { errorText } from '../api';
import { canvasFrameChoices, frameRoute } from '../exportApi';
import { shareApi, sharesChanged } from '../shareApi';
import { useModalDialog } from '../usePopover';
import { CopyButton, copyText } from './CopyButton';
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

function offNote(links: ShareLink[], server: ShareServerState): string | null {
  if (!links.some((l) => !l.active)) return null;
  return server.running ? 'Viewers of a link that is off see a page that says it no longer works.' : 'No link is on, so the share server is off and old addresses do not answer.';
}

function hiddenNote(links: ShareLink[]): string | null {
  return links.some((l) => l.active && !sessionTokens.has(l.id)) ? 'A link shows its address only when you make it. To copy it again, make a new link.' : null;
}

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`export-switch${on ? ' on' : ''}`} disabled={disabled} onClick={() => onChange(!on)}>
      <span className="export-switch-knob" />
    </button>
  );
}

function CursorSwitch({ link, busy, onCursor }: { link: ShareLink; busy: boolean; onCursor: (id: string, on: boolean) => void }) {
  return (
    <div className="share-lan-row share-cursor-row">
      <div className="share-lan-text">
        <span className="share-lan-title">Show my cursor to viewers</span>
        <span className="share-lan-help">{link.studioCursor ? 'On: viewers see your pointer over the frames you do not edit now, and over the frame you edit while Comment is on.' : 'Off: viewers do not see your pointer.'}</span>
      </div>
      <Switch on={link.studioCursor} label="Show my cursor to viewers" disabled={busy} onChange={(on) => onCursor(link.id, on)} />
    </div>
  );
}

function linkMeta(link: ShareLink, now: number): string {
  const parts = [`${link.frames.length} frame${link.frames.length === 1 ? '' : 's'}`, `${link.comments} comment${link.comments === 1 ? '' : 's'}`];
  if (link.live && link.active) parts.unshift(`Live · ${link.viewers} viewer${link.viewers === 1 ? '' : 's'}`);
  return [...parts, endsText(link, now)].join(' · ');
}

type RowProps = { server: ShareServerState; now: number; onRevoke: (id: string) => void; onCursor: (id: string, on: boolean) => void; busy: boolean; copied: string | null };

function LinkRow({ link, server, now, onRevoke, onCursor, busy, copied }: RowProps & { link: ShareLink }) {
  const token = sessionTokens.get(link.id);
  return (
    <li className={`share-link${link.active ? '' : ' off'}`} data-testid="share-link" data-link-id={link.id}>
      <div className="share-link-head">
        <span className="share-link-title truncate" data-tip={link.title} data-tip-align="start">{link.title}</span>
        <span className="share-link-meta truncate">{linkMeta(link, now)}</span>
        {link.active && (
          <button type="button" className="btn ghost small danger" disabled={busy} onClick={() => onRevoke(link.id)} data-tip={link.live ? 'The link stops working at once, open viewers are cut off and its images are deleted' : 'The link stops working at once and its images are deleted'}>
            Revoke
          </button>
        )}
      </div>
      {link.active && token && <LinkUrls token={token} server={server} />}
      {copied === link.id && <p className="share-link-note" role="status">Link copied. Paste it to share.</p>}
      {link.active && link.live && <CursorSwitch link={link} busy={busy} onCursor={onCursor} />}
    </li>
  );
}

function LinkList({ links, ...rest }: RowProps & { links: ShareLink[] }) {
  if (links.length === 0) return null;
  const notes = [hiddenNote(links), offNote(links, rest.server)].filter((note): note is string => note !== null);
  return (
    <div className="share-links-group">
      <ul className="share-links" aria-label="Share links">
        {links.map((link) => (
          <LinkRow key={link.id} link={link} {...rest} />
        ))}
      </ul>
      {notes.map((note) => (
        <p key={note} className="share-link-note">
          {note}
        </p>
      ))}
    </div>
  );
}

function LanSwitch({ server, hasLive, busy, onChange }: { server: ShareServerState; hasLive: boolean; busy: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="share-lan">
      <div className="share-lan-row">
        <div className="share-lan-text">
          <span className="share-lan-title">Allow on local network</span>
          <span className="share-lan-help">{server.lan && server.lanUrl ? `On: devices on this network can open links at ${server.lanUrl}.` : 'Off: only this computer can open links (127.0.0.1).'}</span>
        </div>
        <span data-tip={hasLive ? undefined : 'Make a link first'}>
          <Switch on={server.lan} label="Allow on local network" disabled={busy || (!hasLive && !server.lan)} onChange={onChange} />
        </span>
      </div>
      {server.lan && (
        <div className="alert share-lan-warn" role="alert">
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
  const watching = links.some((l) => l.live && l.active);
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => void reload().catch(() => undefined), 3000);
    return () => window.clearInterval(timer);
  }, [watching, reload]);
  const act = useCallback(
    async (task: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        await task();
        await reload();
        sharesChanged(projectId);
      } catch (err) {
        setError(errorText(err));
      } finally {
        setBusy(false);
      }
    },
    [reload, projectId],
  );
  return { links, server, error, busy, act };
}

function useCopyNew(links: ShareLink[], server: ShareServerState) {
  const [pending, setPending] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const token = pending ? sessionTokens.get(pending) : undefined;
    if (!pending || !token || !server.localUrl || !links.some((l) => l.id === pending)) return;
    setPending(null);
    document.querySelector<HTMLElement>(`[data-link-id="${pending}"] .copy-btn`)?.focus();
    void copyText(shareUrl(server.localUrl, token)).then((ok) => setId(ok ? pending : null));
  }, [pending, links, server.localUrl]);
  return { id, made: setPending };
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
  const [liveView, setLiveView] = useState(false);
  const shares = useShares(target.projectId);
  const now = Date.now();
  const chosenChoices = frames.filter((f) => picked.has(f.id));
  const chosen = chosenChoices.map((f) => f.frame);
  const live = shares.links.filter((l) => l.active);
  const shown = [...live, ...shares.links.filter((l) => !l.active).slice(0, 3)];
  const versionId = target.versionId;
  const canCreate = Boolean(versionId) && chosen.length > 0 && chosen.length <= SHARE_MAX_FRAMES && !shares.busy;
  const copied = useCopyNew(shares.links, shares.server);

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
      const made = await shareApi.create(target.projectId, { directionId: target.directionId, versionId, frames: chosen, frameIds: chosenChoices.map((f) => f.id), expiresInHours: expiry, live: liveView });
      sessionTokens.set(made.link.id, made.token);
      copied.made(made.link.id);
    });
  };

  return (
    <dialog ref={dialog.ref} className="modal share-dialog" aria-label="Share a read-only link" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Share a read-only link</h2>
            <p>Viewers see images of the frames and can comment. They cannot edit, run the app or reach the studio.</p>
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
                <span className="export-frame-path truncate">{frameRoute(choice.frame)}</span>
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
          <div className="share-lan-row">
            <div className="share-lan-text">
              <span className="share-lan-title">Live</span>
              <span className="share-lan-help">{liveView ? 'Viewers get a new image of each frame each time you save a version, and you see their cursors on the canvas.' : 'Off: viewers see the images from when you made the link.'}</span>
            </div>
            <Switch on={liveView} label="Live" disabled={shares.busy} onChange={setLiveView} />
          </div>
          {!versionId && <p className="share-link-note">Save a version first. A link shares a saved version.</p>}
          {shares.error && (
            <div className="alert error small" role="alert">
              {shares.error}
            </div>
          )}
          <LinkList
            links={shown}
            server={shares.server}
            now={now}
            busy={shares.busy}
            copied={copied.id}
            onRevoke={(id) => void shares.act(() => shareApi.revoke(target.projectId, id))}
            onCursor={(id, on) => void shares.act(() => shareApi.setStudioCursor(target.projectId, id, on))}
          />
          <LanSwitch server={shares.server} hasLive={live.length > 0} busy={shares.busy} onChange={(on) => void shares.act(() => shareApi.setLan(on))} />
        </div>
        <div className="modal-foot">
          <span className="share-foot-note">No upload: links work only while Design Studio is open on this computer.</span>
          <span className="share-spacer" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
          <button type="submit" className="btn primary" disabled={!canCreate} data-autofocus>
            {shares.busy ? 'Working…' : 'Create link'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
