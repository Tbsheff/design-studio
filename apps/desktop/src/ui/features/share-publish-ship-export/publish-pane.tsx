import { CopyButton } from "@design-studio/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PUBLISH_DEFAULT_EXPIRY_DAYS,
  PUBLISH_MAX_FRAMES,
  PUBLISH_PASSWORD_MIN,
  publishExpiryText,
  publishSize,
} from "../../../shared/publish.js";
import type {
  Publication,
  PublishExpiryDays,
  PublishKind,
  PublishPlan,
} from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { canvasFrameName } from "../canvas/canvas-frames.js";
import { copy } from "./copy.js";
import { canvasFrameChoices } from "./export-api.js";
import { pick } from "./pick.js";
import { PublicationRow } from "./publication-row.js";
import { publishApi } from "./publish-api.js";
import type { PublishRequest } from "./publish-api.js";
import { usePublishBackend } from "./publish-backend-setup.js";
import { PublishSetupBody, usePublishCli } from "./publish-setup.js";
import { ignoreFailure } from "./settle.js";

export interface PublishTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
}

const EXPIRIES: { id: PublishExpiryDays; label: string }[] = [
  { id: 1, label: "1 day" },
  { id: 7, label: "7 days" },
  { id: 30, label: "30 days" },
  { id: 0, label: "No end" },
];

const usePublications = (projectId: string) => {
  const [list, setList] = useState<Publication[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await publishApi.list(projectId);
    setList(next.publications);
    setBackendError(next.backendError);
  }, [projectId]);

  useEffect(() => {
    void ignoreFailure(reload());
  }, [reload]);

  return { backendError, list, reload };
};

const Toggle = ({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    className={`export-switch${pick(on, " on", "")}`}
    onClick={() => onChange(!on)}
  >
    <span className="export-switch-knob" />
  </button>
);

interface FormState {
  picked: Set<string>;
  passwordOn: boolean;
  password: string;
  expiry: PublishExpiryDays;
  comments: boolean;
  viewerComments: boolean;
  indexable: boolean;
}

const FramePicker = ({
  target,
  form,
  setForm,
}: {
  target: PublishTarget;
  form: FormState;
  setForm: (state: FormState) => void;
}) => {
  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const toggle = (id: string) => {
    const next = new Set(form.picked);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setForm({ ...form, picked: next });
  };

  return (
    <fieldset className="export-field export-frames">
      <legend className="export-label">{copy.framesPublishedAsImages}</legend>
      {frames.map((choice) => (
        <label key={choice.id} className="export-frame">
          <input
            type="checkbox"
            checked={form.picked.has(choice.id)}
            onChange={() => toggle(choice.id)}
          />
          <span className="export-frame-name">
            {canvasFrameName(target.projectId, choice.id, choice.frame.name)}
          </span>
          <span className="export-frame-size">
            {choice.frame.width} × {choice.frame.height}
          </span>
        </label>
      ))}
    </fieldset>
  );
};

const SwitchRow = ({
  title,
  help,
  on,
  onChange,
}: {
  title: string;
  help: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) => (
  <div className="share-lan-row">
    <div className="share-lan-text">
      <span className="share-lan-title">{title}</span>
      <span className="share-lan-help">{help}</span>
    </div>
    <Toggle on={on} label={title} onChange={onChange} />
  </div>
);

const PublishForm = ({
  target,
  form,
  setForm,
}: {
  target: PublishTarget;
  form: FormState;
  setForm: (state: FormState) => void;
}) => (
  <div className="publish-form">
    {target.kind === "site" ? (
      <p className="publish-step-text">{copy.everyPageOfThe}</p>
    ) : (
      <FramePicker target={target} form={form} setForm={setForm} />
    )}
    <SwitchRow
      title={copy.password}
      help={
        form.passwordOn
          ? "Viewers type it on a sign-in page."
          : "Off: anyone with the URL can open it."
      }
      on={form.passwordOn}
      onChange={(on) => setForm({ ...form, passwordOn: on })}
    />
    {form.passwordOn && (
      <label className="field">
        <span>Password ({PUBLISH_PASSWORD_MIN} or more characters)</span>
        <input
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </label>
    )}
    <div className="export-field">
      <span className="export-label">{copy.stopsWorkingAfter}</span>
      <div
        className="segmented export-seg"
        role="radiogroup"
        aria-label={copy.stopsWorkingAfter}
      >
        {EXPIRIES.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={form.expiry === option.id}
            className={pick(form.expiry === option.id, "on", "")}
            onClick={() => setForm({ ...form, expiry: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
    {target.kind === "viewer" && (
      <SwitchRow
        title={copy.showOpenComments}
        help={
          form.comments
            ? "Open studio comments show as read-only text next to the frames."
            : "Off: only the images go up."
        }
        on={form.comments}
        onChange={(on) => setForm({ ...form, comments: on })}
      />
    )}
    <SwitchRow
      title={copy.viewerComments}
      help={
        form.viewerComments
          ? "Viewers can leave a name and a comment on a comments page. You can delete them here."
          : "Off: viewers cannot comment."
      }
      on={form.viewerComments}
      onChange={(on) => setForm({ ...form, viewerComments: on })}
    />
    <SwitchRow
      title={copy.searchEngines}
      help={
        form.indexable
          ? "On: search engines may list this design."
          : "Off: pages send noindex."
      }
      on={form.indexable}
      onChange={(on) => setForm({ ...form, indexable: on })}
    />
  </div>
);

const filesText = (plan: PublishPlan): string => {
  const base = `${plan.fileCount} file${pick(plan.fileCount === 1, "", "s")}, ${publishSize(plan.bytes)}`;

  return plan.changedFiles === null
    ? base
    : `${base} (${plan.changedFiles} changed since the live version)`;
};

const PlanView = ({ plan }: { plan: PublishPlan }) => {
  const rows: [string, string][] = [
    ["Address", plan.url ?? plan.urlPattern],
    [pick(plan.kind === "site", "Pages", "Frames"), plan.pages.join(", ")],
    ["Files", filesText(plan)],
    ["Password", pick(plan.password, "On", "Off: anyone with the URL")],
    ["Ends", publishExpiryText(plan.expiresAt)],
    ["Comments", pick(plan.viewerComments, "Viewers can comment", "Off")],
    ["Indexing", plan.noindex ? "noindex" : "Search engines may list it"],
    ["Version", plan.versionId.slice(0, 7)],
  ];

  if (plan.kind === "viewer") {
    rows.push([
      "Studio notes",
      plan.comments > 0
        ? `${plan.comments} open comment${pick(plan.comments === 1, "", "s")}`
        : "None",
    ]);
  }

  return (
    <div className="publish-plan" data-testid="publish-plan">
      <div className="alert publish-public" role="alert">
        This goes on the public internet.{" "}
        {plan.republishOf
          ? "It becomes the live version at this address; older versions stay for rollback."
          : "Anyone who has the address can open it."}
      </div>
      {plan.warnings.map((warning) => (
        <div key={warning} className="alert small" role="note">
          {warning}
        </div>
      ))}
      <dl className="publish-plan-list">
        {rows.map(([label, value]) => (
          <div key={label} className="publish-kv">
            <dt>{label}</dt>
            <dd className={pick(label === "Address", "mono", "")}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="share-link-note">
        {plan.backend === "local"
          ? "Target: local test server."
          : "Target: your publish Worker on Cloudflare."}{" "}
        Only files that the Worker does not have yet upload.
      </p>
    </div>
  );
};

const planInputOf = (
  target: PublishTarget,
  form: FormState
): PublishRequest => {
  const frames = canvasFrameChoices(
    target.projectId,
    target.directionId
  ).filter((choice) => form.picked.has(choice.id));

  const input: PublishRequest = {
    expiresInDays: form.expiry,
    noindex: !form.indexable,
    versionId: target.versionId ?? undefined,
    viewerComments: form.viewerComments,
    ...(target.directionId ? { directionId: target.directionId } : {}),
    ...(form.passwordOn ? { password: form.password } : {}),
  };

  if (target.kind === "viewer") {
    Object.assign(input, {
      comments: form.comments,
      frames: frames.map((frame) => frame.id),
    });
  }

  return input;
};

const formError = (target: PublishTarget, form: FormState): string | null => {
  if (!target.versionId) {
    return "Save a version first. Publish takes a saved version.";
  }

  if (form.passwordOn && form.password.length < PUBLISH_PASSWORD_MIN) {
    return `Type a password of ${PUBLISH_PASSWORD_MIN} or more characters, or turn Password off.`;
  }

  if (
    target.kind === "viewer" &&
    (form.picked.size === 0 || form.picked.size > PUBLISH_MAX_FRAMES)
  ) {
    return `Pick 1 to ${PUBLISH_MAX_FRAMES} frames.`;
  }

  return null;
};

const usePublishFlow = (target: PublishTarget) => {
  const pubs = usePublications(target.projectId);
  const [plan, setPlan] = useState<PublishPlan | null>(null);
  const [asked, setAsked] = useState<PublishRequest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Publication | null>(null);

  const act = async (label: string, task: () => Promise<void>) => {
    setBusy(label);
    setError(null);

    try {
      await task();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(null);
    }
  };

  const check = (input: PublishRequest) =>
    act("Checking…", async () => {
      setPlan(await publishApi.plan(target.projectId, input));
      setAsked(input);
    });

  const confirm = () =>
    act("Publishing…", async () => {
      if (!plan || !asked) {
        return;
      }

      const made = await publishApi.publish(target.projectId, asked);
      setPlan(null);
      setDone(made.publication);
      await pubs.reload();

      if (made.publication.status !== "live") {
        setError(made.publication.error ?? "Publish failed.");
      }
    });

  const unpublish = (publication: Publication) =>
    act("Unpublishing…", async () => {
      await publishApi.unpublish(target.projectId, publication.id);
      await pubs.reload();
    });

  const rollback = (publication: Publication, versionId: string) =>
    act("Rolling back…", async () => {
      await publishApi.rollback(target.projectId, publication.id, versionId);
      await pubs.reload();
    });

  return {
    busy,
    check,
    confirm,
    done,
    error,
    plan,
    pubs,
    rollback,
    setPlan,
    unpublish,
  };
};

const DoneNote = ({ done }: { done: Publication }) => {
  if (done.status !== "live" || !done.url) {
    return null;
  }

  const upload = done.lastUpload
    ? ` Uploaded ${done.lastUpload.sent}, reused ${done.lastUpload.reused}.`
    : "";

  return (
    <div
      className="share-url publish-done"
      role="status"
      data-testid="publish-done"
    >
      <span className="share-url-kind">{copy.published}</span>
      <code className="mono truncate">{done.url}</code>
      <CopyButton text={done.url} label="Copy link" />
      {upload && <span className="publish-done-upload">{upload.trim()}</span>}
    </div>
  );
};

type Flow = ReturnType<typeof usePublishFlow>;

const PaneFoot = ({
  flow,
  ready,
  problem,
  onClose,
  onCheck,
}: {
  flow: Flow;
  ready: boolean;
  problem: string | null;
  onClose: () => void;
  onCheck: () => void;
}) => (
  <div className="modal-foot">
    <span className="share-foot-note">
      {flow.plan
        ? "Nothing is uploaded until you click Publish."
        : ready && problem
          ? problem
          : "Hosted by your own publish Worker."}
    </span>
    <span className="share-spacer" />
    {flow.plan ? (
      <>
        <button
          type="button"
          className="btn ghost"
          disabled={flow.busy !== null}
          onClick={() => flow.setPlan(null)}
        >
          {copy.back}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={flow.busy !== null}
          onClick={() => void flow.confirm()}
          data-autofocus
        >
          {flow.busy ?? pick(flow.plan.republishOf, "Republish", "Publish")}
        </button>
      </>
    ) : (
      <>
        <button type="button" className="btn ghost" onClick={onClose}>
          {copy.close}
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!ready || problem !== null || flow.busy !== null}
          onClick={onCheck}
        >
          {flow.busy ?? "Check what goes public"}
        </button>
      </>
    )}
  </div>
);

const PublishPane = ({
  target,
  onClose,
}: {
  target: PublishTarget;
  onClose: () => void;
}) => {
  const cli = usePublishCli();
  const backend = usePublishBackend();
  const flow = usePublishFlow(target);

  const [form, setForm] = useState<FormState>(() => ({
    comments: false,
    expiry: PUBLISH_DEFAULT_EXPIRY_DAYS,
    indexable: false,
    password: "",
    passwordOn: false,
    picked: new Set(
      canvasFrameChoices(target.projectId, target.directionId)
        .slice(0, PUBLISH_MAX_FRAMES)
        .map((choice) => choice.id)
    ),
    viewerComments: false,
  }));

  const ready = backend.backend?.ready === true;
  const problem = formError(target, form);
  const now = Date.now();

  const shown = flow.pubs.list
    .filter((p) => p.status !== "removed")
    .concat(flow.pubs.list.filter((p) => p.status === "removed").slice(0, 2));

  return (
    <>
      <div className="modal-body share-body publish-body">
        {!ready && <PublishSetupBody state={cli} backend={backend} />}
        {ready && !flow.plan && (
          <PublishForm target={target} form={form} setForm={setForm} />
        )}
        {flow.plan && <PlanView plan={flow.plan} />}
        {flow.done && !flow.plan && <DoneNote done={flow.done} />}
        {(flow.error ?? flow.pubs.backendError) && (
          <div className="alert error small" role="alert">
            {flow.error ?? flow.pubs.backendError}
          </div>
        )}
        {shown.length > 0 && (
          <ul className="share-links" aria-label={copy.publications}>
            {shown.map((publication) => (
              <PublicationRow
                key={publication.id}
                publication={publication}
                now={now}
                projectId={target.projectId}
                busy={flow.busy !== null}
                onRepublish={(pub) =>
                  void flow.check({
                    publicationId: pub.id,
                    versionId: target.versionId ?? undefined,
                  })
                }
                onUnpublish={(pub) => void flow.unpublish(pub)}
                onRollback={(pub, vid) => void flow.rollback(pub, vid)}
                onChanged={() => void flow.pubs.reload()}
              />
            ))}
          </ul>
        )}
      </div>
      <PaneFoot
        flow={flow}
        ready={ready}
        problem={problem}
        onClose={onClose}
        onCheck={() => void flow.check(planInputOf(target, form))}
      />
    </>
  );
};

export { PublishPane };
