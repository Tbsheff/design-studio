import { useCallback, useEffect, useMemo, useState } from 'react';
import { PUBLISH_DEFAULT_EXPIRY_DAYS, PUBLISH_MAX_FRAMES, PUBLISH_PASSWORD_MIN, publishExpiryText, publishSize, type Publication, type PublishExpiryDays, type PublishKind, type PublishPlan, type PublishPlanInput } from '../../shared/publish';
import { errorText } from '../api';
import { canvasFrameChoices } from '../exportApi';
import { publishApi } from '../publishApi';
import { canvasFrameName } from './CanvasFrames';
import { CopyButton } from './CopyButton';
import { cliReady, PublishSetupBody, usePublishCli } from './PublishSetup';

export interface PublishTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
}

const EXPIRIES: { id: PublishExpiryDays; label: string }[] = [
  { id: 1, label: '1 day' },
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 0, label: 'No end' },
];

function usePublications(projectId: string) {
  const [list, setList] = useState<Publication[]>([]);
  const reload = useCallback(async () => setList((await publishApi.list(projectId)).publications), [projectId]);
  useEffect(() => {
    void reload().catch(() => undefined);
  }, [reload]);
  return { list, reload };
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`export-switch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
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
}

function FramePicker({ target, form, setForm }: { target: PublishTarget; form: FormState; setForm: (f: FormState) => void }) {
  const frames = useMemo(() => canvasFrameChoices(target.projectId, target.directionId), [target.projectId, target.directionId]);
  const toggle = (id: string) => {
    const next = new Set(form.picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setForm({ ...form, picked: next });
  };
  return (
    <fieldset className="export-field export-frames">
      <legend className="export-label">Frames (published as images)</legend>
      {frames.map((choice) => (
        <label key={choice.id} className="export-frame">
          <input type="checkbox" checked={form.picked.has(choice.id)} onChange={() => toggle(choice.id)} />
          <span className="export-frame-name">{canvasFrameName(target.projectId, choice.id, choice.frame.name)}</span>
          <span className="export-frame-size">
            {choice.frame.width} × {choice.frame.height}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function PublishForm({ target, form, setForm }: { target: PublishTarget; form: FormState; setForm: (f: FormState) => void }) {
  return (
    <div className="publish-form">
      {target.kind === 'site' ? <p className="publish-step-text">Every page of the saved version goes up as a static site: HTML, CSS, scripts, images and fonts. Source files, .env, node_modules and studio scripts stay on this Mac.</p> : <FramePicker target={target} form={form} setForm={setForm} />}
      <div className="share-lan-row">
        <div className="share-lan-text">
          <span className="share-lan-title">Password</span>
          <span className="share-lan-help">{form.passwordOn ? 'Viewers type it in a browser prompt. Any user name works.' : 'Off: anyone with the URL can open it.'}</span>
        </div>
        <Toggle on={form.passwordOn} label="Password" onChange={(on) => setForm({ ...form, passwordOn: on })} />
      </div>
      {form.passwordOn && (
        <label className="field">
          <span>Password ({PUBLISH_PASSWORD_MIN} or more characters)</span>
          <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
      )}
      <div className="export-field">
        <span className="export-label">Stops working after</span>
        <div className="segmented export-seg" role="radiogroup" aria-label="Stops working after">
          {EXPIRIES.map((o) => (
            <button key={o.id} type="button" role="radio" aria-checked={form.expiry === o.id} className={form.expiry === o.id ? 'on' : ''} onClick={() => setForm({ ...form, expiry: o.id })}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {target.kind === 'viewer' && (
        <div className="share-lan-row">
          <div className="share-lan-text">
            <span className="share-lan-title">Show open comments</span>
            <span className="share-lan-help">{form.comments ? 'Open comments show as read-only text next to the frames.' : 'Off: only the images go up.'}</span>
          </div>
          <Toggle on={form.comments} label="Show open comments" onChange={(on) => setForm({ ...form, comments: on })} />
        </div>
      )}
    </div>
  );
}

function PlanView({ plan }: { plan: PublishPlan }) {
  const rows: [string, string][] = [
    ['Address', plan.url ?? plan.urlPattern],
    [plan.kind === 'site' ? 'Pages' : 'Frames', plan.pages.join(', ')],
    ['Files', `${plan.fileCount} file${plan.fileCount === 1 ? '' : 's'}, ${publishSize(plan.bytes)}`],
    ['Password', plan.password ? 'On' : 'Off: anyone with the URL'],
    ['Ends', publishExpiryText(plan.expiresAt)],
    ['Version', plan.versionId.slice(0, 7)],
  ];
  if (plan.kind === 'viewer') rows.push(['Comments', plan.comments > 0 ? `${plan.comments} open comment${plan.comments === 1 ? '' : 's'}` : 'None']);
  return (
    <div className="publish-plan" data-testid="publish-plan">
      <div className="alert publish-public" role="alert">
        This goes on the public internet. {plan.republishOf ? 'It replaces what is at this address now.' : 'Anyone who has the address can open it.'}
      </div>
      <dl className="publish-plan-list">
        {rows.map(([k, v]) => (
          <div key={k} className="publish-kv">
            <dt>{k}</dt>
            <dd className={k === 'Address' ? 'mono' : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="share-link-note">cf checked the bundle: {plan.check.split('\n').find((l) => /Total Upload/.test(l))?.replace(/^[\s│]+/, '') ?? 'ok'}</p>
    </div>
  );
}

function statusText(p: Publication, now: number): string {
  if (p.status === 'removed') return 'Unpublished';
  if (p.status === 'failed') return 'Failed';
  if (p.status === 'publishing') return 'Publishing…';
  return [publishExpiryText(p.expiresAt, now), p.password ? 'Password' : 'Public', `v ${p.versionId.slice(0, 7)}`].join(' · ');
}

type RowActions = { busy: boolean; onRepublish: (p: Publication) => void; onUnpublish: (p: Publication) => void };

function PublicationRow({ p, now, busy, onRepublish, onUnpublish }: RowActions & { p: Publication; now: number }) {
  const live = p.status === 'live' || p.status === 'failed';
  return (
    <li className={`share-link${p.status === 'live' ? '' : ' off'}`} data-testid="publication" data-publication-id={p.id}>
      <div className="share-link-head">
        <span className="share-link-title">
          <span className="truncate">{p.title}</span>
        </span>
        <span className="share-link-meta truncate">{statusText(p, now)}</span>
        {live && (
          <>
            <button type="button" className="btn ghost small" disabled={busy} onClick={() => onRepublish(p)} data-tip="Check the head version for this address, then confirm">
              Republish latest
            </button>
            <button type="button" className="btn ghost small danger" disabled={busy} onClick={() => onUnpublish(p)} data-tip="Deletes the Cloudflare Worker; the address stops working">
              Unpublish
            </button>
          </>
        )}
      </div>
      {p.url && p.status === 'live' && (
        <div className="share-url">
          <span className="share-url-kind">{new Date(p.updatedAt).toLocaleDateString()}</span>
          <code className="mono truncate">{p.url}</code>
          <span className="publish-url-actions">
            <a className="btn ghost small" href={p.url} target="_blank" rel="noreferrer noopener">
              Open
            </a>
            <CopyButton text={p.url} label="Copy link" />
          </span>
        </div>
      )}
      {p.error && <p className="publish-error">{p.error}</p>}
    </li>
  );
}

function planInputOf(target: PublishTarget, form: FormState): PublishPlanInput {
  const frames = canvasFrameChoices(target.projectId, target.directionId).filter((f) => form.picked.has(f.id));
  const input: PublishPlanInput = { versionId: target.versionId ?? undefined, expiresInDays: form.expiry, ...(target.directionId ? { directionId: target.directionId } : {}) };
  if (form.passwordOn) input.password = form.password;
  if (target.kind === 'viewer') Object.assign(input, { frames: frames.map((f) => f.frame), frameIds: frames.map((f) => f.id), comments: form.comments });
  return input;
}

function formError(target: PublishTarget, form: FormState): string | null {
  if (!target.versionId) return 'Save a version first. Publish takes a saved version.';
  if (form.passwordOn && form.password.length < PUBLISH_PASSWORD_MIN) return `Type a password of ${PUBLISH_PASSWORD_MIN} or more characters, or turn Password off.`;
  if (target.kind === 'viewer' && (form.picked.size === 0 || form.picked.size > PUBLISH_MAX_FRAMES)) return `Pick 1 to ${PUBLISH_MAX_FRAMES} frames.`;
  return null;
}

function usePublishFlow(target: PublishTarget) {
  const pubs = usePublications(target.projectId);
  const [plan, setPlan] = useState<PublishPlan | null>(null);
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
  const check = (input: PublishPlanInput) => act('Checking…', async () => setPlan(await publishApi.plan(target.projectId, input)));
  const confirm = () =>
    act('Publishing…', async () => {
      if (!plan) return;
      const made = await publishApi.publish(target.projectId, plan.id);
      setPlan(null);
      setDone(made.publication);
      await pubs.reload();
      if (made.publication.status !== 'live') setError(made.publication.error ?? 'Publish failed.');
    });
  const unpublish = (p: Publication) =>
    act('Unpublishing…', async () => {
      await publishApi.unpublish(target.projectId, p.id);
      await pubs.reload();
    });
  return { pubs, plan, setPlan, busy, error, done, check, confirm, unpublish };
}

export default function PublishPane({ target, onClose }: { target: PublishTarget; onClose: () => void }) {
  const cli = usePublishCli();
  const flow = usePublishFlow(target);
  const [form, setForm] = useState<FormState>(() => ({ picked: new Set(canvasFrameChoices(target.projectId, target.directionId).slice(0, PUBLISH_MAX_FRAMES).map((f) => f.id)), passwordOn: false, password: '', expiry: PUBLISH_DEFAULT_EXPIRY_DAYS, comments: false }));
  const ready = cliReady(cli.cli);
  const problem = formError(target, form);
  const now = Date.now();
  const shown = flow.pubs.list.filter((p) => p.status !== 'removed').concat(flow.pubs.list.filter((p) => p.status === 'removed').slice(0, 2));
  return (
    <>
      <div className="modal-body share-body publish-body">
        {!ready && <PublishSetupBody state={cli} />}
        {ready && !flow.plan && <PublishForm target={target} form={form} setForm={setForm} />}
        {flow.plan && <PlanView plan={flow.plan} />}
        {flow.done?.status === 'live' && flow.done.url && !flow.plan && (
          <div className="share-url publish-done" role="status">
            <span className="share-url-kind">Published</span>
            <code className="mono truncate">{flow.done.url}</code>
            <CopyButton text={flow.done.url} label="Copy link" />
          </div>
        )}
        {flow.error && (
          <div className="alert error small" role="alert">
            {flow.error}
          </div>
        )}
        {shown.length > 0 && (
          <ul className="share-links" aria-label="Publications">
            {shown.map((p) => (
              <PublicationRow key={p.id} p={p} now={now} busy={flow.busy !== null} onRepublish={(pub) => void flow.check({ publicationId: pub.id, versionId: target.versionId ?? undefined })} onUnpublish={(pub) => void flow.unpublish(pub)} />
            ))}
          </ul>
        )}
      </div>
      <div className="modal-foot">
        <span className="share-foot-note">{flow.plan ? 'Nothing is uploaded until you click Publish.' : ready && problem ? problem : 'Hosted on your Cloudflare account through cf.'}</span>
        <span className="share-spacer" />
        {flow.plan ? (
          <>
            <button type="button" className="btn ghost" disabled={flow.busy !== null} onClick={() => flow.setPlan(null)}>
              Back
            </button>
            <button type="button" className="btn primary" disabled={flow.busy !== null} onClick={() => void flow.confirm()} data-autofocus>
              {flow.busy ?? (flow.plan.republishOf ? 'Republish' : 'Publish')}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn primary" disabled={!ready || problem !== null || flow.busy !== null} onClick={() => void flow.check(planInputOf(target, form))}>
              {flow.busy ?? 'Check what goes public'}
            </button>
          </>
        )}
      </div>
    </>
  );
}
