import { useCallback, useEffect, useState } from "react";

import {
  publishExpiryText,
  type Publication,
  type PublicationComment,
} from "../../shared/publish";
import { errorText } from "../api";
import { CopyButton } from "../kit/CopyButton";
import { publishApi } from "../publishApi";

function statusText(p: Publication, now: number): string {
  if (p.status === "removed") {
    return "Unpublished";
  }

  if (p.status === "failed") {
    return "Failed";
  }

  if (p.status === "ended") {
    return "Ended";
  }

  if (p.status === "publishing") {
    return "Publishing…";
  }

  const views = p.views
    ? `${p.views.total} view${p.views.total === 1 ? "" : "s"}, ${p.views.last7} this week`
    : null;

  return [
    publishExpiryText(p.expiresAt, now),
    p.password ? "Password" : "Public",
    views,
    `v ${p.versionId.slice(0, 7)}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface RowProps {
  p: Publication;
  now: number;
  projectId: string;
  busy: boolean;
  onRepublish: (p: Publication) => void;
  onUnpublish: (p: Publication) => void;
  onRollback: (p: Publication, versionId: string) => void;
  onChanged: () => void;
}

function Versions({
  p,
  busy,
  onRollback,
}: Pick<RowProps, "p" | "busy" | "onRollback">) {
  return (
    <ol
      className="publish-versions"
      aria-label="Published versions"
      data-testid="publish-versions"
    >
      {p.versions.map((v) => (
        <li key={v.id} className="publish-version">
          <span className="truncate">
            {v.committedAt
              ? new Date(v.committedAt).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "Pending"}{" "}
            · v {v.sourceVersion.slice(0, 7)} · {v.fileCount} files
          </span>
          {v.live ? (
            <span className="publish-live-tag">Live</span>
          ) : (
            <button
              type="button"
              className="btn ghost small"
              disabled={busy}
              onClick={() => onRollback(p, v.id)}
              data-tip="Point the address back at this version. Nothing uploads."
            >
              Make live
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

function Comments({
  p,
  projectId,
  onChanged,
}: {
  p: Publication;
  projectId: string;
  onChanged: () => void;
}) {
  const [list, setList] = useState<PublicationComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList((await publishApi.comments(projectId, p.id)).comments);
    } catch (err) {
      setError(errorText(err));
    }
  }, [projectId, p.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (cid: string) => {
    try {
      await publishApi.deleteComment(projectId, p.id, cid);
      await load();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="publish-comments" data-testid="publish-comments">
      {error && <p className="publish-error">{error}</p>}
      {list?.length === 0 && (
        <p className="publish-step-text">No viewer comments yet.</p>
      )}
      <ol>
        {list?.map((c) => (
          <li key={c.id} className="publish-comment">
            <div className="publish-comment-text">
              <span className="publish-comment-who">{c.author}</span>
              <span className="publish-comment-body">{c.body}</span>
            </div>
            <button
              type="button"
              className="btn ghost small danger"
              onClick={() => void remove(c.id)}
              data-tip="Deletes the comment for everyone"
            >
              Delete
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RowActions({
  p,
  busy,
  onRepublish,
  onUnpublish,
  open,
  setOpen,
}: Pick<RowProps, "p" | "busy" | "onRepublish" | "onUnpublish"> & {
  open: string | null;
  setOpen: (v: string | null) => void;
}) {
  const app = p.backend === "app";
  const toggle = (name: string) => setOpen(open === name ? null : name);

  return (
    <>
      {app && p.versions.length > 1 && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "versions"}
          onClick={() => toggle("versions")}
          data-tip="Published versions; make an older one live"
        >
          Versions {p.versions.length}
        </button>
      )}
      {app && (p.viewerComments || p.commentCount > 0) && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "comments"}
          onClick={() => toggle("comments")}
          data-tip="Read and delete viewer comments"
        >
          Comments {p.commentCount}
        </button>
      )}
      {app && p.status === "live" && (
        <button
          type="button"
          className="btn ghost small"
          disabled={busy}
          onClick={() => onRepublish(p)}
          data-tip="Check the head version for this address, then confirm"
        >
          Republish
        </button>
      )}
      <button
        type="button"
        className="btn ghost small danger"
        disabled={busy}
        onClick={() => onUnpublish(p)}
        data-tip={
          app
            ? "Turns the address off (410) and deletes its files"
            : "Deletes the old per-design Cloudflare Worker"
        }
      >
        Unpublish
      </button>
    </>
  );
}

export function PublicationRow({
  p,
  now,
  projectId,
  busy,
  onRepublish,
  onUnpublish,
  onRollback,
  onChanged,
}: RowProps) {
  const [open, setOpen] = useState<string | null>(null);
  const active = p.status !== "removed";

  return (
    <li
      className={`share-link${p.status === "live" ? "" : " off"}`}
      data-testid="publication"
      data-publication-id={p.id}
      data-status={p.status}
    >
      <div className="share-link-head">
        <span className="share-link-title">
          <span className="truncate">{p.title}</span>
          {p.backend !== "app" && (
            <span
              className="publish-legacy-tag"
              data-tip="Published before the shared publish Worker"
            >
              Old Worker
            </span>
          )}
        </span>
        {active && (
          <RowActions
            p={p}
            busy={busy}
            onRepublish={onRepublish}
            onUnpublish={onUnpublish}
            open={open}
            setOpen={setOpen}
          />
        )}
      </div>
      <span
        className="share-link-meta publish-row-meta truncate"
        data-tip={
          p.views
            ? `${p.views.last7} views in the last 7 days. Counts page opens per day; no personal data.`
            : undefined
        }
      >
        {statusText(p, now)}
      </span>
      {p.url && p.status === "live" && (
        <div className="share-url">
          <span className="share-url-kind">
            {new Date(p.updatedAt).toLocaleDateString()}
          </span>
          <code className="mono truncate">{p.url}</code>
          <span className="publish-url-actions">
            <a
              className="btn ghost small"
              href={p.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open
            </a>
            <CopyButton text={p.url} label="Copy link" />
          </span>
        </div>
      )}
      {open === "versions" && (
        <Versions p={p} busy={busy} onRollback={onRollback} />
      )}
      {open === "comments" && (
        <Comments p={p} projectId={projectId} onChanged={onChanged} />
      )}
      {p.error && <p className="publish-error">{p.error}</p>}
    </li>
  );
}
