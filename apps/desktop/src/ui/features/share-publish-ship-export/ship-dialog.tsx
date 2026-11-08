import type {
  ShipFile,
  ShipMode,
  ShipPrepare,
  ShipResult,
} from "@design-studio/contracts/ship";
import { CopyButton, Icon, UiSelect, useModalDialog } from "@design-studio/ui";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { errorText } from "../../api.js";
import { copy } from "./copy.js";
import { pick } from "./pick.js";

import "../../styles/ship.css";
import { settle } from "./settle.js";
import { shipApi } from "./ship-api.js";
import {
  formatFact,
  freshDraft,
  shippable,
  STATUS_LETTER,
  MODES,
  modeBlock,
  FIRST_COMMIT,
  conflictHint,
  fieldsOf,
  shipRequestOf,
  leadText,
  footNote,
  actionLabel,
} from "./ship-model.js";
import type { Draft, Fields } from "./ship-model.js";

export interface Props {
  projectId: string;
  onClose: () => void;
}

const DiffView = ({ file }: { file: ShipFile | null }) => {
  if (!file) {
    return <div className="ship-diff empty">{copy.pickAFileTo}</div>;
  }

  const all = file.diff.replace(/\n$/, "").split("\n");
  const start = all.findIndex((line) => line.startsWith("@@"));

  const lines =
    start === -1
      ? [
          file.diff.includes("Binary files")
            ? "Binary file. No text diff."
            : pick(
                file.status === "deleted",
                "The file is deleted.",
                "No text changes."
              ),
        ]
      : all.slice(start);

  return (
    <div className="ship-diff" aria-label={`Diff of ${file.path}`}>
      {(file.refused || file.conflict) && (
        <div
          className={`ship-diff-note ${pick(file.refused, "refused", "conflict")}`}
        >
          {file.refused ?? file.conflict}
        </div>
      )}
      <pre>
        {lines.map((line, index) => (
          <span
            key={index}
            className={
              line.startsWith("+")
                ? "add"
                : line.startsWith("-")
                  ? "del"
                  : pick(line.startsWith("@@"), "hunk", "")
            }
          >
            {line || " "}
            {"\n"}
          </span>
        ))}
      </pre>
      {file.diffCut && (
        <div className="ship-diff-note">{copy.theDiffIsCut}</div>
      )}
    </div>
  );
};

const ResultView = ({
  result,
  onClose,
}: {
  result: ShipResult;
  onClose: () => void;
}) => (
  <>
    <div className="modal-body ship-result" role="status">
      <p className="ship-result-lead">
        <Icon name="check" size={14} />{" "}
        {result.mode === "branch"
          ? "Branch created in your repo."
          : pick(result.prUrl, "Pull request opened.", "Branch pushed.")}{" "}
        Your checked-out branch and files did not change.
      </p>
      <dl className="ship-facts">
        <dt>{copy.branch}</dt>
        <dd className="mono">{result.branch}</dd>
        <dt>{copy.commit}</dt>
        <dd className="mono">{result.sha.slice(0, 12)}</dd>
        <dt>{copy.files2}</dt>
        <dd>{result.files.length}</dd>
        {result.format && (
          <>
            <dt>{copy.format}</dt>
            <dd data-tip={result.format.note}>{formatFact(result.format)}</dd>
          </>
        )}
        {result.pushed && (
          <>
            <dt>{copy.pushedTo}</dt>
            <dd className="mono">{result.remote}</dd>
          </>
        )}
        {result.prUrl && (
          <>
            <dt>{copy.pullRequest}</dt>
            <dd>
              <a href={result.prUrl} target="_blank" rel="noreferrer noopener">
                {result.prUrl}
              </a>
            </dd>
          </>
        )}
      </dl>
      {result.format && result.format.errors.length > 0 && (
        <div className="alert warn small" role="alert">
          {result.format.tool} could not format{" "}
          {result.format.errors.map((item) => item.path).join(", ")}, so{" "}
          {pick(result.format.errors.length === 1, "it ships", "they ship")} as
          the studio wrote{" "}
          {pick(result.format.errors.length === 1, "it", "them")}.
        </div>
      )}
      {result.prError && (
        <div className="alert warn small" role="alert">
          {result.prError}
        </div>
      )}
      {result.mode === "branch" && (
        <p className="field-help">To see it: git switch {result.branch}</p>
      )}
    </div>
    <div className="modal-foot">
      <span className="ship-spacer" />
      <button
        type="button"
        className="btn primary"
        data-autofocus
        onClick={onClose}
      >
        {copy.done}
      </button>
    </div>
  </>
);

const usePlan = (projectId: string, baseId: string | undefined) => {
  const [plan, setPlan] = useState<ShipPrepare | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setPlan(null);
    setLoadError(null);
    void settle(
      shipApi.prepare(projectId, baseId),
      (next) => {
        if (!live) {
          return;
        }
        setPlan(next);
        setDraft((prev) => freshDraft(next, prev?.mode ?? "branch"));
        setFocus(
          next.files.find(shippable)?.path ?? next.files[0]?.path ?? null
        );
      },
      (error) => live && setLoadError(errorText(error))
    );

    return () => {
      live = false;
    };
  }, [projectId, baseId]);

  return { draft, focus, loadError, plan, setDraft, setFocus };
};

const FileList = ({
  plan,
  draft,
  focus,
  onFocus,
  onToggle,
}: {
  plan: ShipPrepare;
  draft: Draft;
  focus: string | null;
  onFocus: (path: string) => void;
  onToggle: (path: string) => void;
}) => (
  <div className="ship-files-wrap">
    <ul className="ship-files" aria-label={copy.changedFiles}>
      {plan.files.map((file) => (
        <li key={file.path} className={pick(file.path === focus, "active", "")}>
          <input
            type="checkbox"
            aria-label={`Ship ${file.path}`}
            checked={draft.files.has(file.path)}
            disabled={!shippable(file)}
            onChange={() => onToggle(file.path)}
          />
          <button
            type="button"
            className="ship-file"
            onClick={() => onFocus(file.path)}
            data-tip={file.refused ?? file.conflict ?? file.path}
          >
            <span className={`ship-status ${file.status}`}>
              {STATUS_LETTER[file.status]}
            </span>
            <span className="mono truncate">{file.path}</span>
            {(file.refused || file.conflict) && <Icon name="alert" size={12} />}
            <span className="ship-counts">
              {file.additions !== null && (
                <span className="add">+{file.additions}</span>
              )}
              {file.deletions !== null && (
                <span className="del">−{file.deletions}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
    <DiffView
      file={plan.files.find((shipFile) => shipFile.path === focus) ?? null}
    />
  </div>
);

const ModePicker = ({
  plan,
  mode,
  onMode,
}: {
  plan: ShipPrepare;
  mode: ShipMode;
  onMode: (mode: ShipMode) => void;
}) => (
  <fieldset className="ship-modes ship-wide">
    <legend>{copy.whenDone}</legend>
    {MODES.map((item) => {
      const why = modeBlock(plan, item.id);

      return (
        <label
          key={item.id}
          className={`ship-mode${pick(why, " off", "")}`}
          data-tip={why ?? item.hint}
        >
          <input
            type="radio"
            name="ship-mode"
            checked={mode === item.id}
            disabled={Boolean(why)}
            onChange={() => onMode(item.id)}
          />
          <span>{item.label}</span>
          <small>{why ?? item.hint}</small>
        </label>
      );
    })}
  </fieldset>
);

const ShipFields = ({
  plan,
  draft,
  fields,
  patch,
}: {
  plan: ShipPrepare;
  draft: Draft;
  fields: Fields;
  patch: (next: Partial<Draft>) => void;
}) => (
  <div className="ship-fields">
    <label className="field">
      <span>{copy.issueId}</span>
      <input
        className="mono"
        value={draft.issue}
        placeholder={copy.qa1234}
        spellCheck={false}
        autoComplete="off"
        onChange={(changeEvent) => patch({ issue: changeEvent.target.value })}
      />
    </label>
    <label className="field">
      <span>{copy.branch}</span>
      <input
        className="mono"
        value={fields.branch}
        spellCheck={false}
        autoComplete="off"
        onChange={(changeEvent) => patch({ branch: changeEvent.target.value })}
      />
    </label>
    <label className="field ship-wide">
      <span>{copy.commitMessage}</span>
      <textarea
        className="mono"
        rows={3}
        value={fields.commitMessage}
        onChange={(changeEvent) =>
          patch({ commitMessage: changeEvent.target.value })
        }
      />
    </label>
    <ModePicker
      plan={plan}
      mode={draft.mode}
      onMode={(mode) => patch({ mode })}
    />
    {draft.mode === "pr" && (
      <>
        <label className="field ship-wide">
          <span>{copy.pullRequestTitle}</span>
          <input
            value={fields.title}
            onChange={(changeEvent) =>
              patch({ title: changeEvent.target.value })
            }
          />
        </label>
        <label className="field ship-wide">
          <span>{copy.pullRequestBody}</span>
          <textarea
            className="mono"
            rows={6}
            value={fields.body}
            onChange={(changeEvent) =>
              patch({ body: changeEvent.target.value })
            }
          />
        </label>
      </>
    )}
  </div>
);

const ShipEmpty = ({ text }: { text: string | null }) => (
  <div className="ship-empty" role="status">
    <span className="ship-empty-icon" aria-hidden="true">
      <Icon name="branch" size={16} />
    </span>
    <p className="ship-empty-title">
      {text ?? "There is nothing to ship yet."}
    </p>
    <p className="ship-empty-text">{copy.runThisInThe}</p>
    <div className="ship-empty-command">
      <code>{FIRST_COMMIT}</code>
      <CopyButton text={FIRST_COMMIT} label="Copy command" />
    </div>
  </div>
);

const PlanView = ({
  plan,
  draft,
  fields,
  focus,
  onFocus,
  onBase,
  setDraft,
}: {
  plan: ShipPrepare;
  draft: Draft | null;
  fields: Fields | null;
  focus: string | null;
  onFocus: (path: string) => void;
  onBase: (id: string) => void;
  setDraft: Dispatch<SetStateAction<Draft | null>>;
}) => {
  const patch = (next: Partial<Draft>) =>
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));

  const toggle = (file: string) =>
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      const files = new Set(prev.files);

      if (!files.delete(file)) {
        files.add(file);
      }

      return { ...prev, files };
    });

  if (plan.bases.length === 0) {
    return <ShipEmpty text={plan.blocked} />;
  }

  const bases = plan.bases.map((second) => ({
    label: second.title,
    value: second.versionId,
  }));

  return (
    <>
      <div className="field ship-base">
        <span id="ship-base-label">{copy.changesSince}</span>
        <UiSelect
          aria-labelledby="ship-base-label"
          value={plan.base?.versionId ?? ""}
          options={bases}
          onChange={onBase}
        />
      </div>
      {plan.blocked && (
        <div className="alert small" role="status">
          {plan.blocked}
        </div>
      )}
      {plan.files.length > 0 && draft && (
        <FileList
          plan={plan}
          draft={draft}
          focus={focus}
          onFocus={onFocus}
          onToggle={toggle}
        />
      )}
      {plan.files.some((shipFile) => shipFile.conflict) && (
        <p className="ship-warn">{conflictHint(plan)}</p>
      )}
      {draft && fields && !plan.blocked && (
        <ShipFields plan={plan} draft={draft} fields={fields} patch={patch} />
      )}
    </>
  );
};

export const ShipDialog = ({ projectId, onClose }: Props) => {
  const [baseId, setBaseId] = useState<string | undefined>();

  const { plan, draft, setDraft, focus, setFocus, loadError } = usePlan(
    projectId,
    baseId
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShipResult | null>(null);

  const dialog = useModalDialog(() => {
    if (busy) {
      return false;
    }

    onClose();
  });

  const fields = useMemo(
    () => (plan && draft ? fieldsOf(plan, draft) : null),
    [plan, draft]
  );

  const count = draft?.files.size ?? 0;
  const request = shipRequestOf(plan, draft, fields);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!request || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      setResult(await shipApi.ship(projectId, request));
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };

  const shown = error ?? loadError;

  return (
    <dialog
      ref={dialog.ref}
      className="modal ship-dialog"
      aria-label={copy.shipAsA}
      onMouseDown={dialog.onMouseDown}
    >
      <form
        className="modal-form"
        onSubmit={(submitEvent) => void submit(submitEvent)}
        noValidate
      >
        <div className="modal-head">
          <div className="titles">
            <h2>{copy.shipAsA}</h2>
            <p>{leadText(plan)}</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label={copy.close}
            onClick={onClose}
            disabled={busy}
          >
            <Icon name="close" />
          </button>
        </div>
        {result ? (
          <ResultView result={result} onClose={onClose} />
        ) : (
          <>
            <div className="modal-body ship-body">
              {!plan && !shown && (
                <p className="muted">{copy.readingChanges}</p>
              )}
              {plan && (
                <PlanView
                  plan={plan}
                  draft={draft}
                  fields={fields}
                  focus={focus}
                  onFocus={setFocus}
                  onBase={setBaseId}
                  setDraft={setDraft}
                />
              )}
              {shown && (
                <div className="alert error small" role="alert">
                  {shown}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <span
                className="ship-foot-note"
                data-tip={`${plan?.format?.note ?? "Git hooks do not run."} .env files, secrets and node_modules never ship.`}
              >
                {footNote(plan)}
              </span>
              <span className="ship-spacer" />
              <button
                type="button"
                className="btn ghost"
                onClick={onClose}
                disabled={busy}
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={!request || busy}
              >
                {busy
                  ? "Shipping…"
                  : `${actionLabel(draft?.mode ?? "branch")}${pick(count > 0, ` (${count})`, "")}`}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
};
