import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PUBLISH_DEFAULT_EXPIRY_DAYS,
  PUBLISH_MAX_FRAMES,
  PUBLISH_PASSWORD_MIN,
  publishExpiryText,
  publishSize,
  type Publication,
  type PublishExpiryDays,
  type PublishKind,
  type PublishPlan,
} from "../../shared/publish";
import { errorText } from "../api";
import { canvasFrameChoices } from "../exportApi";
import { CopyButton } from "../kit/CopyButton";
import { publishApi, type PublishRequest } from "../publishApi";
import { canvasFrameName } from "./CanvasFrames";
import { PublicationRow } from "./PublicationRow";
import { usePublishBackend } from "./PublishBackendSetup";
import { PublishSetupBody, usePublishCli } from "./PublishSetup";

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

function usePublications(projectId: string) {
  const [list, setList] = useState<Publication[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await publishApi.list(projectId);
    setList(next.publications);
    setBackendError(next.backendError);
  }, [projectId]);

  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);

  return { list, backendError, reload };
}

function Toggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`export-switch${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="export-switch-knob" />
    </button>
  );
}

interface FormState {
  picked: Set<string>;
  passwordOn: boolean;
  password: string;
  expiry: PublishExpiryDays;
  comments: boolean;
  viewerComments: boolean;
  indexable: boolean;
}

function FramePicker({
  target,
  form,
  setForm,
}: {
  target: PublishTarget;
  form: FormState;
  setForm: (f: FormState) => void;
}) {
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
      <legend className="export-label">Frames (published as images)</legend>
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
}

function SwitchRow({
  title,
  help,
  on,
  onChange,
}: {
  title: string;
  help: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="share-lan-row">
      <div className="share-lan-text">
        <span className="share-lan-title">{title}</span>
        <span className="share-lan-help">{help}</span>
      </div>
      <Toggle on={on} label={title} onChange={onChange} />
    </div>
  );
}

function PublishForm({
  target,
  form,
  setForm,
}: {
  target: PublishTarget;
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  return (
    <div className="publish-form">
      {target.kind === "site" ? (
        <p className="publish-step-text">
          Every page of the saved version goes up as a static site: HTML, CSS,
          scripts, images and fonts. Source files, .env, node_modules and studio
          scripts stay on this Mac.
        </p>
      ) : (
        <FramePicker target={target} form={form} setForm={setForm} />
      )}
      <SwitchRow
        title="Password"
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
        <span className="export-label">Stops working after</span>
        <div
          className="segmented export-seg"
          role="radiogroup"
          aria-label="Stops working after"
        >
          {EXPIRIES.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={form.expiry === o.id}
              className={form.expiry === o.id ? "on" : ""}
              onClick={() => setForm({ ...form, expiry: o.id })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {target.kind === "viewer" && (
        <SwitchRow
          title="Show open comments"
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
        title="Viewer comments"
        help={
          form.viewerComments
            ? "Viewers can leave a name and a comment on a comments page. You can delete them here."
            : "Off: viewers cannot comment."
        }
        on={form.viewerComments}
        onChange={(on) => setForm({ ...form, viewerComments: on })}
      />
      <SwitchRow
        title="Search engines"
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
}

function filesText(plan: PublishPlan): string {
  const base = `${plan.fileCount} file${plan.fileCount === 1 ? "" : "s"}, ${publishSize(plan.bytes)}`;

  return plan.changedFiles === null
    ? base
    : `${base} (${plan.changedFiles} changed since the live version)`;
}

function PlanView({ plan }: { plan: PublishPlan }) {
  const rows: [string, string][] = [
    ["Address", plan.url ?? plan.urlPattern],
    [plan.kind === "site" ? "Pages" : "Frames", plan.pages.join(", ")],
    ["Files", filesText(plan)],
    ["Password", plan.password ? "On" : "Off: anyone with the URL"],
    ["Ends", publishExpiryText(plan.expiresAt)],
    ["Comments", plan.viewerComments ? "Viewers can comment" : "Off"],
    ["Indexing", plan.noindex ? "noindex" : "Search engines may list it"],
    ["Version", plan.versionId.slice(0, 7)],
  ];

  if (plan.kind === "viewer") {
    rows.push([
      "Studio notes",
      plan.comments > 0
        ? `${plan.comments} open comment${plan.comments === 1 ? "" : "s"}`
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
      {plan.warnings.map((w) => (
        <div key={w} className="alert small" role="note">
          {w}
        </div>
      ))}
      <dl className="publish-plan-list">
        {rows.map(([k, v]) => (
          <div key={k} className="publish-kv">
            <dt>{k}</dt>
            <dd className={k === "Address" ? "mono" : undefined}>{v}</dd>
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
}

function planInputOf(target: PublishTarget, form: FormState): PublishRequest {
  const frames = canvasFrameChoices(
    target.projectId,
    target.directionId
  ).filter((f) => form.picked.has(f.id));

  const input: PublishRequest = {
    versionId: target.versionId ?? undefined,
    expiresInDays: form.expiry,
    viewerComments: form.viewerComments,
    noindex: !form.indexable,
    ...(target.directionId ? { directionId: target.directionId } : {}),
  };

  if (form.passwordOn) {
    input.password = form.password;
  }

  if (target.kind === "viewer") {
    Object.assign(input, {
      frames: frames.map((f) => f.id),
      comments: form.comments,
    });
  }

  return input;
}

function formError(target: PublishTarget, form: FormState): string | null {
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
}

function usePublishFlow(target: PublishTarget) {
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
    } catch (err) {
      setError(errorText(err));
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

  const unpublish = (p: Publication) =>
    act("Unpublishing…", async () => {
      await publishApi.unpublish(target.projectId, p.id);
      await pubs.reload();
    });

  const rollback = (p: Publication, versionId: string) =>
    act("Rolling back…", async () => {
      await publishApi.rollback(target.projectId, p.id, versionId);
      await pubs.reload();
    });

  return {
    pubs,
    plan,
    setPlan,
    busy,
    error,
    done,
    check,
    confirm,
    unpublish,
    rollback,
  };
}

function DoneNote({ done }: { done: Publication }) {
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
      <span className="share-url-kind">Published</span>
      <code className="mono truncate">{done.url}</code>
      <CopyButton text={done.url} label="Copy link" />
      {upload && <span className="publish-done-upload">{upload.trim()}</span>}
    </div>
  );
}

type Flow = ReturnType<typeof usePublishFlow>;

function PaneFoot({
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
}) {
  return (
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
            Back
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={flow.busy !== null}
            onClick={() => void flow.confirm()}
            data-autofocus
          >
            {flow.busy ?? (flow.plan.republishOf ? "Republish" : "Publish")}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
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
}

export default function PublishPane({
  target,
  onClose,
}: {
  target: PublishTarget;
  onClose: () => void;
}) {
  const cli = usePublishCli();
  const backend = usePublishBackend();
  const flow = usePublishFlow(target);

  const [form, setForm] = useState<FormState>(() => ({
    picked: new Set(
      canvasFrameChoices(target.projectId, target.directionId)
        .slice(0, PUBLISH_MAX_FRAMES)
        .map((f) => f.id)
    ),
    passwordOn: false,
    password: "",
    expiry: PUBLISH_DEFAULT_EXPIRY_DAYS,
    comments: false,
    viewerComments: false,
    indexable: false,
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
          <ul className="share-links" aria-label="Publications">
            {shown.map((p) => (
              <PublicationRow
                key={p.id}
                p={p}
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
}
