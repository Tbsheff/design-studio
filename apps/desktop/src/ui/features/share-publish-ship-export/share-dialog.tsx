import {
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_MAX_FRAMES,
  shareUrl,
} from "@design-studio/contracts/share";
import type {
  ShareExpiryHours,
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import { CopyButton, copyText, Icon, useModalDialog } from "@design-studio/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { PublishKind } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { canvasFrameName, framePage } from "../canvas/canvas-frames.js";
import { copy } from "./copy.js";
import { canvasFrameChoices, frameRoute } from "./export-api.js";
import { PublishPane } from "./publish-pane.js";
import { catchFailure, ignoreFailure, settleValue } from "./settle.js";

import "../../styles/export.css";
import "../../styles/share.css";
import { shareApi, sharesChanged } from "./share-api.js";
import { linkMeta } from "./share-text.js";

export interface ShareTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
  mode?: ShareMode;
}

type ShareMode = "link" | "publish";

const ShareTabs = ({
  mode,
  onMode,
}: {
  mode: ShareMode;
  onMode: (mode: ShareMode) => void;
}) => (
  <div className="segmented share-tabs" role="tablist" aria-label={copy.tabs}>
    {(["link", "publish"] as const).map((id) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={mode === id}
        className={mode === id ? "on" : ""}
        onClick={() => onMode(id)}
      >
        {id === "link" ? "Local link" : "Publish"}
      </button>
    ))}
  </div>
);

const EXPIRIES: { id: ShareExpiryHours; label: string }[] = [
  { id: 1, label: "1 hour" },
  { id: 24, label: "24 hours" },
  { id: 168, label: "7 days" },
];

const sessionTokens = new Map<string, string>();

const LinkUrls = ({
  token,
  server,
}: {
  token: string;
  server: ShareServerState;
}) => {
  const local = server.localUrl ? shareUrl(server.localUrl, token) : null;
  const lan = server.lanUrl ? shareUrl(server.lanUrl, token) : null;

  return (
    <div className="share-urls">
      {local && (
        <div className="share-url">
          <span className="share-url-kind">{copy.thisComputer}</span>
          <code className="mono truncate">{local}</code>
          <CopyButton text={local} label="Copy link" />
        </div>
      )}
      {lan && (
        <div className="share-url">
          <span className="share-url-kind">{copy.localNetwork}</span>
          <code className="mono truncate">{lan}</code>
          <CopyButton text={lan} label="Copy link" />
        </div>
      )}
    </div>
  );
};

const offNote = (
  links: ShareLink[],
  server: ShareServerState
): string | null => {
  if (!links.some((link) => !link.active)) {
    return null;
  }

  return server.running ? copy.offNoteRunning : copy.offNoteStopped;
};

const hiddenNote = (links: ShareLink[]): string | null =>
  links.some((link) => link.active && !sessionTokens.has(link.id))
    ? "A link shows its address only when you make it. To copy it again, make a new link."
    : null;

const Switch = ({
  on,
  label,
  disabled,
  onChange,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`export-switch${on ? " on" : ""}`}
    disabled={disabled}
    onClick={() => onChange(!on)}
  >
    <span className="export-switch-knob" />
  </button>
);

const CursorSwitch = ({
  link,
  busy,
  onCursor,
}: {
  link: ShareLink;
  busy: boolean;
  onCursor: (id: string, on: boolean) => void;
}) => (
  <div className="share-lan-row share-cursor-row">
    <div className="share-lan-text">
      <span className="share-lan-title">{copy.showMyCursorTo}</span>
      <span className="share-lan-help">
        {link.studioCursor
          ? "On: viewers see your pointer over the frames you do not edit now, and over the frame you edit while Comment is on."
          : "Off: viewers do not see your pointer."}
      </span>
    </div>
    <Switch
      on={link.studioCursor}
      label="Show my cursor to viewers"
      disabled={busy}
      onChange={(on) => onCursor(link.id, on)}
    />
  </div>
);

interface RowProps {
  server: ShareServerState;
  now: number;
  onRevoke: (id: string) => void;
  onCursor: (id: string, on: boolean) => void;
  busy: boolean;
  copied: string | null;
}

const LinkRow = ({
  link,
  server,
  now,
  onRevoke,
  onCursor,
  busy,
  copied,
}: RowProps & { link: ShareLink }) => {
  const token = sessionTokens.get(link.id);

  return (
    <li
      className={`share-link${link.active ? "" : " off"}`}
      data-testid="share-link"
      data-link-id={link.id}
    >
      <div className="share-link-head">
        <span
          className="share-link-title"
          data-tip={link.title}
          data-tip-align="start"
        >
          <span className="truncate">{link.title}</span>
        </span>
        <span className="share-link-meta truncate">{linkMeta(link, now)}</span>
        {link.active && (
          <button
            type="button"
            className="btn ghost small danger"
            disabled={busy}
            onClick={() => onRevoke(link.id)}
            data-tip={
              link.live
                ? "The link stops working at once, open viewers are cut off and its images are deleted"
                : "The link stops working at once and its images are deleted"
            }
          >
            {copy.revoke}
          </button>
        )}
      </div>
      {link.active && token && <LinkUrls token={token} server={server} />}
      {copied === link.id && (
        <p className="share-link-note" role="status">
          {copy.linkCopiedPasteIt}
        </p>
      )}
      {link.active && link.live && (
        <CursorSwitch link={link} busy={busy} onCursor={onCursor} />
      )}
    </li>
  );
};

const LinkList = ({ links, ...rest }: RowProps & { links: ShareLink[] }) => {
  if (links.length === 0) {
    return null;
  }

  const notes = [hiddenNote(links), offNote(links, rest.server)].filter(
    (note): note is string => note !== null
  );

  return (
    <div className="share-links-group">
      <ul className="share-links" aria-label={copy.shareLinks}>
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
};

const LanSwitch = ({
  server,
  hasLive,
  busy,
  onChange,
}: {
  server: ShareServerState;
  hasLive: boolean;
  busy: boolean;
  onChange: (on: boolean) => void;
}) => (
  <div className="share-lan">
    <div className="share-lan-row">
      <div className="share-lan-text">
        <span className="share-lan-title">{copy.allowOnLocalNetwork}</span>
        <span className="share-lan-help">
          {server.lan && server.lanUrl
            ? `On: devices on this network can open links at ${server.lanUrl}.`
            : "Off: only this computer can open links (127.0.0.1)."}
        </span>
      </div>
      <span data-tip={hasLive ? null : "Make a link first"}>
        <Switch
          on={server.lan}
          label="Allow on local network"
          disabled={busy || (!hasLive && !server.lan)}
          onChange={onChange}
        />
      </span>
    </div>
    {server.lan && (
      <div className="alert share-lan-warn" role="alert">
        {copy.anyoneOnThisNetwork}
      </div>
    )}
  </div>
);

const useShares = (projectId: string) => {
  const [links, setLinks] = useState<ShareLink[]>([]);

  const [server, setServer] = useState<ShareServerState>({
    lan: false,
    lanUrl: null,
    localUrl: null,
    running: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const list = await shareApi.list(projectId);
    setLinks(list.links);
    setServer(list.server);
  }, [projectId]);

  useEffect(() => {
    void catchFailure(reload(), (failure) => setError(errorText(failure)));
  }, [reload]);
  const watching = links.some((link) => link.live && link.active);
  useEffect(() => {
    if (!watching) {
      return;
    }

    const timer = globalThis.setInterval(
      () => void ignoreFailure(reload()),
      3000
    );

    return () => globalThis.clearInterval(timer);
  }, [watching, reload]);

  const act = useCallback(
    async (task: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);

      try {
        await task();
        await reload();
        sharesChanged(projectId);
      } catch (failure) {
        setError(errorText(failure));
      } finally {
        setBusy(false);
      }
    },
    [reload, projectId]
  );

  return { act, busy, error, links, server };
};

const useCopyNew = (links: ShareLink[], server: ShareServerState) => {
  const [pending, setPending] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const token = pending ? sessionTokens.get(pending) : null;

    if (
      !pending ||
      !token ||
      !server.localUrl ||
      !links.some((link) => link.id === pending)
    ) {
      return;
    }

    setPending(null);
    document
      .querySelector<HTMLElement>(`[data-link-id="${pending}"] .copy-btn`)
      ?.focus();
    void settleValue(copyText(shareUrl(server.localUrl, token)), (ok) =>
      setId(ok ? pending : null)
    );
  }, [pending, links, server.localUrl]);

  return { id, made: setPending };
};

const ExpiryPicker = ({
  value,
  onChange,
}: {
  value: ShareExpiryHours;
  onChange: (value: ShareExpiryHours) => void;
}) => (
  <div
    className="segmented export-seg"
    role="radiogroup"
    aria-label={copy.linkEndsAfter}
  >
    {EXPIRIES.map((option) => (
      <button
        key={option.id}
        type="button"
        role="radio"
        aria-checked={value === option.id}
        className={value === option.id ? "on" : ""}
        onClick={() => onChange(option.id)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export const ShareDialog = ({
  target,
  onClose,
}: {
  target: ShareTarget;
  onClose: () => void;
}) => {
  const dialog = useModalDialog(onClose);
  const [mode, setMode] = useState<ShareMode>(target.mode ?? "link");
  const tabs = <ShareTabs mode={mode} onMode={setMode} />;

  return (
    <dialog
      ref={dialog.ref}
      className="modal share-dialog"
      aria-label={
        mode === "link" ? "Share a read-only link" : "Publish on Cloudflare"
      }
      onMouseDown={dialog.onMouseDown}
    >
      {mode === "link" ? (
        <LinkShare target={target} onClose={onClose} tabs={tabs} />
      ) : (
        <>
          <div className="modal-head">
            <div className="titles">
              <h2>{copy.publishOnCloudflare}</h2>
              <p>{copy.putASavedVersion}</p>
            </div>
            {tabs}
            <button
              type="button"
              className="icon-btn"
              aria-label={copy.close}
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <PublishPane target={target} onClose={onClose} />
        </>
      )}
    </dialog>
  );
};

const LinkShare = ({
  target,
  onClose,
  tabs,
}: {
  target: ShareTarget;
  onClose: () => void;
  tabs: ReactNode;
}) => {
  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(frames.slice(0, SHARE_MAX_FRAMES).map((choice) => choice.id))
  );

  const [expiry, setExpiry] = useState<ShareExpiryHours>(
    SHARE_DEFAULT_EXPIRY_HOURS
  );

  const [liveView, setLiveView] = useState(false);
  const shares = useShares(target.projectId);
  const now = Date.now();
  const chosenChoices = frames.filter((frame) => picked.has(frame.id));
  const chosen = chosenChoices.map((chosenChoice) => chosenChoice.frame);
  const live = shares.links.filter((link) => link.active);
  const shown = [
    ...live,
    ...shares.links.filter((link) => !link.active).slice(0, 3),
  ];
  const { versionId } = target;

  const canCreate =
    Boolean(versionId) &&
    chosen.length > 0 &&
    chosen.length <= SHARE_MAX_FRAMES &&
    !shares.busy;

  const copied = useCopyNew(shares.links, shares.server);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!canCreate || !versionId) {
      return;
    }

    void shares.act(async () => {
      const made = await shareApi.create(target.projectId, {
        directionId: target.directionId,
        expiresInHours: expiry,
        frameIds: chosenChoices.map((chosenChoice) => chosenChoice.id),
        frames: chosen,
        live: liveView,
        versionId,
      });

      sessionTokens.set(made.link.id, made.token);
      copied.made(made.link.id);
    });
  };

  return (
    <form className="modal-form" onSubmit={submit} noValidate>
      <div className="modal-head">
        <div className="titles">
          <h2>{copy.shareAReadOnly}</h2>
          <p>{copy.viewersSeeImagesOf}</p>
        </div>
        {tabs}
        <button
          type="button"
          className="icon-btn"
          aria-label={copy.close}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body share-body">
        <fieldset className="export-field export-frames">
          <legend className="export-label">{copy.frames}</legend>
          {frames.map((choice) => (
            <label key={choice.id} className="export-frame">
              <input
                type="checkbox"
                checked={picked.has(choice.id)}
                onChange={() => toggle(choice.id)}
              />
              <span className="export-frame-name">
                {canvasFrameName(
                  target.projectId,
                  choice.id,
                  choice.frame.name
                )}
              </span>
              <span
                className="export-frame-path truncate"
                data-tip={frameRoute(choice.frame)}
              >
                {framePage(choice.frame.path)}
              </span>
              <span className="export-frame-size">
                {choice.frame.width} × {choice.frame.height}
              </span>
            </label>
          ))}
        </fieldset>
        <div className="export-field">
          <span className="export-label">{copy.linkEndsAfter}</span>
          <ExpiryPicker value={expiry} onChange={setExpiry} />
        </div>
        <div className="share-lan-row">
          <div className="share-lan-text">
            <span className="share-lan-title">{copy.live}</span>
            <span className="share-lan-help">
              {liveView
                ? "Viewers get a new image of each frame each time you save a version, and you see their cursors on the canvas."
                : "Off: viewers see the images from when you made the link."}
            </span>
          </div>
          <Switch
            on={liveView}
            label="Live"
            disabled={shares.busy}
            onChange={setLiveView}
          />
        </div>
        {!versionId && (
          <p className="share-link-note">{copy.saveAVersionFirst}</p>
        )}
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
          onRevoke={(id) =>
            void shares.act(() => shareApi.revoke(target.projectId, id))
          }
          onCursor={(id, on) =>
            void shares.act(() =>
              shareApi.setStudioCursor(target.projectId, id, on)
            )
          }
        />
        <LanSwitch
          server={shares.server}
          hasLive={live.length > 0}
          busy={shares.busy}
          onChange={(on) => void shares.act(() => shareApi.setLan(on))}
        />
      </div>
      <div className="modal-foot">
        <span className="share-foot-note">{copy.noUploadLinksWork}</span>
        <span className="share-spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          {copy.close}
        </button>
        <button
          type="submit"
          className="btn primary"
          disabled={!canCreate}
          data-autofocus
        >
          {shares.busy ? "Working…" : "Create link"}
        </button>
      </div>
    </form>
  );
};
