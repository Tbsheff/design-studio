import { CopyButton } from "@design-studio/ui";
import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";

import { publishExpiryText } from "../../../shared/publish.js";
import type {
  Publication,
  PublicationComment,
} from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { isReadOnlyPublication, publishApi } from "./publish-api.js";

const statusText = (p: Publication, now: number): string => {
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
};

interface RowProps {
  p: Publication;
  now: number;
  projectId: string;
  busy: boolean;
  onRepublish: (p: Publication) => void;
  onUnpublish: (p: Publication) => void;
  onRollback: (p: Publication, versionId: string) => void;
  onChanged: () => void;
}

const Versions = ({
  p,
  busy,
  onRollback,
}: Pick<RowProps, "p" | "busy" | "onRollback">): ReactElement => (
  <ol
    className="publish-versions"
    aria-label={copy.versions}
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
          {copy.v}
          {v.sourceVersion.slice(0, 7)}
          {copy.dot}
          {v.fileCount}
          {copy.files}
        </span>
        {v.live ? (
          <span className="publish-live-tag">{copy.live}</span>
        ) : (
          <button
            type="button"
            className="btn ghost small"
            disabled={busy}
            onClick={() => onRollback(p, v.id)}
            data-tip={copy.restoreTip}
          >
            {copy.makeLive}
          </button>
        )}
      </li>
    ))}
  </ol>
);

const Comments = ({
  p,
  projectId,
  onChanged,
}: {
  p: Publication;
  projectId: string;
  onChanged: () => void;
}): ReactElement => {
  const [list, setList] = useState<PublicationComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList((await publishApi.comments(projectId, p.id)).comments);
    } catch (failure) {
      setError(errorText(failure));
    }
  }, [projectId, p.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (cid: string): Promise<void> => {
    try {
      await publishApi.deleteComment(projectId, p.id, cid);
      await load();
      onChanged();
    } catch (failure) {
      setError(errorText(failure));
    }
  };

  return (
    <div className="publish-comments" data-testid="publish-comments">
      {error && <p className="publish-error">{error}</p>}
      {list?.length === 0 && (
        <p className="publish-step-text">{copy.noViewerCommentsYet}</p>
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
              data-tip={copy.deleteCommentTip}
            >
              {copy.delete}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
};

const RowActions = ({
  p,
  busy,
  onRepublish,
  onUnpublish,
  open,
  setOpen,
}: Pick<RowProps, "p" | "busy" | "onRepublish" | "onUnpublish"> & {
  open: string | null;
  setOpen: (v: string | null) => void;
}): ReactElement => {
  const app = p.backend === "app" && !isReadOnlyPublication(p);
  const toggle = (name: string): void => setOpen(open === name ? null : name);

  return (
    <>
      {app && p.versions.length > 1 && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "versions"}
          onClick={() => toggle("versions")}
          data-tip={copy.versionsTip}
        >
          {copy.versions2}
          {p.versions.length}
        </button>
      )}
      {app && (p.viewerComments || p.commentCount > 0) && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "comments"}
          onClick={() => toggle("comments")}
          data-tip={copy.commentsTip}
        >
          {copy.comments}
          {p.commentCount}
        </button>
      )}
      {app && p.status === "live" && (
        <button
          type="button"
          className="btn ghost small"
          disabled={busy}
          onClick={() => onRepublish(p)}
          data-tip={copy.publishTip}
        >
          {copy.republish}
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
        {copy.unpublish}
      </button>
    </>
  );
};

const PublicationRow = ({
  p,
  now,
  projectId,
  busy,
  onRepublish,
  onUnpublish,
  onRollback,
  onChanged,
}: RowProps): ReactElement => {
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
          {isReadOnlyPublication(p) && (
            <span className="publish-legacy-tag" data-tip={copy.legacyTip}>
              {copy.legacy}
            </span>
          )}
          {!isReadOnlyPublication(p) && p.backend !== "app" && (
            <span className="publish-legacy-tag" data-tip={copy.workerTip}>
              {copy.oldWorker}
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
            : null
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
              {copy.open}
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
};

export { PublicationRow };

export type { RowProps };
