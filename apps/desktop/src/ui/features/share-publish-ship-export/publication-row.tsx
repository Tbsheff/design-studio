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

const statusText = (publication: Publication, now: number): string => {
  if (publication.status === "removed") {
    return "Unpublished";
  }

  if (publication.status === "failed") {
    return "Failed";
  }

  if (publication.status === "ended") {
    return "Ended";
  }

  if (publication.status === "publishing") {
    return "Publishing…";
  }

  const views = publication.views
    ? `${publication.views.total} view${publication.views.total === 1 ? "" : "s"}, ${publication.views.last7} this week`
    : null;

  return [
    publishExpiryText(publication.expiresAt, now),
    publication.password ? "Password" : "Public",
    views,
    `v ${publication.versionId.slice(0, 7)}`,
  ]
    .filter(Boolean)
    .join(" · ");
};

interface RowProps {
  publication: Publication;
  now: number;
  projectId: string;
  busy: boolean;
  onRepublish: (publication: Publication) => void;
  onUnpublish: (publication: Publication) => void;
  onRollback: (publication: Publication, versionId: string) => void;
  onChanged: () => void;
}

const Versions = ({
  publication,
  busy,
  onRollback,
}: Pick<RowProps, "publication" | "busy" | "onRollback">): ReactElement => (
  <ol
    className="publish-versions"
    aria-label={copy.versions}
    data-testid="publish-versions"
  >
    {publication.versions.map((publishedVersion) => (
      <li key={publishedVersion.id} className="publish-version">
        <span className="truncate">
          {publishedVersion.committedAt
            ? new Date(publishedVersion.committedAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "Pending"}{" "}
          {copy.versionPrefix}
          {publishedVersion.sourceVersion.slice(0, 7)}
          {copy.dot}
          {publishedVersion.fileCount}
          {copy.files}
        </span>
        {publishedVersion.live ? (
          <span className="publish-live-tag">{copy.live}</span>
        ) : (
          <button
            type="button"
            className="btn ghost small"
            disabled={busy}
            onClick={() => onRollback(publication, publishedVersion.id)}
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
  publication,
  projectId,
  onChanged,
}: {
  publication: Publication;
  projectId: string;
  onChanged: () => void;
}): ReactElement => {
  const [list, setList] = useState<PublicationComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList((await publishApi.comments(projectId, publication.id)).comments);
    } catch (failure) {
      setError(errorText(failure));
    }
  }, [projectId, publication.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (cid: string): Promise<void> => {
    try {
      await publishApi.deleteComment(projectId, publication.id, cid);
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
        {list?.map((publicationComment) => (
          <li key={publicationComment.id} className="publish-comment">
            <div className="publish-comment-text">
              <span className="publish-comment-who">
                {publicationComment.author}
              </span>
              <span className="publish-comment-body">
                {publicationComment.body}
              </span>
            </div>
            <button
              type="button"
              className="btn ghost small danger"
              onClick={() => void remove(publicationComment.id)}
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
  publication,
  busy,
  onRepublish,
  onUnpublish,
  open,
  setOpen,
}: Pick<RowProps, "publication" | "busy" | "onRepublish" | "onUnpublish"> & {
  open: string | null;
  setOpen: (value: string | null) => void;
}): ReactElement => {
  const app =
    publication.backend === "app" && !isReadOnlyPublication(publication);
  const toggle = (name: string): void => setOpen(open === name ? null : name);

  return (
    <>
      {app && publication.versions.length > 1 && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "versions"}
          onClick={() => toggle("versions")}
          data-tip={copy.versionsTip}
        >
          {copy.versions2}
          {publication.versions.length}
        </button>
      )}
      {app && (publication.viewerComments || publication.commentCount > 0) && (
        <button
          type="button"
          className="btn ghost small"
          aria-expanded={open === "comments"}
          onClick={() => toggle("comments")}
          data-tip={copy.commentsTip}
        >
          {copy.comments}
          {publication.commentCount}
        </button>
      )}
      {app && publication.status === "live" && (
        <button
          type="button"
          className="btn ghost small"
          disabled={busy}
          onClick={() => onRepublish(publication)}
          data-tip={copy.publishTip}
        >
          {copy.republish}
        </button>
      )}
      <button
        type="button"
        className="btn ghost small danger"
        disabled={busy}
        onClick={() => onUnpublish(publication)}
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
  publication,
  now,
  projectId,
  busy,
  onRepublish,
  onUnpublish,
  onRollback,
  onChanged,
}: RowProps): ReactElement => {
  const [open, setOpen] = useState<string | null>(null);
  const active = publication.status !== "removed";

  return (
    <li
      className={`share-link${publication.status === "live" ? "" : " off"}`}
      data-testid="publication"
      data-publication-id={publication.id}
      data-status={publication.status}
    >
      <div className="share-link-head">
        <span className="share-link-title">
          <span className="truncate">{publication.title}</span>
          {isReadOnlyPublication(publication) && (
            <span className="publish-legacy-tag" data-tip={copy.legacyTip}>
              {copy.legacy}
            </span>
          )}
          {!isReadOnlyPublication(publication) &&
            publication.backend !== "app" && (
              <span className="publish-legacy-tag" data-tip={copy.workerTip}>
                {copy.oldWorker}
              </span>
            )}
        </span>
        {active && (
          <RowActions
            publication={publication}
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
          publication.views
            ? `${publication.views.last7} views in the last 7 days. Counts page opens per day; no personal data.`
            : null
        }
      >
        {statusText(publication, now)}
      </span>
      {publication.url && publication.status === "live" && (
        <div className="share-url">
          <span className="share-url-kind">
            {new Date(publication.updatedAt).toLocaleDateString()}
          </span>
          <code className="mono truncate">{publication.url}</code>
          <span className="publish-url-actions">
            <a
              className="btn ghost small"
              href={publication.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {copy.open}
            </a>
            <CopyButton text={publication.url} label="Copy link" />
          </span>
        </div>
      )}
      {open === "versions" && (
        <Versions
          publication={publication}
          busy={busy}
          onRollback={onRollback}
        />
      )}
      {open === "comments" && (
        <Comments
          publication={publication}
          projectId={projectId}
          onChanged={onChanged}
        />
      )}
      {publication.error && (
        <p className="publish-error">{publication.error}</p>
      )}
    </li>
  );
};

export { PublicationRow };

export type { RowProps };
