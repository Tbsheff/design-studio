import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { cleanPortRoute, PORT_LEVEL_LABEL, suggestPortRoute, type PortPlan, type PortStartResult } from '../../shared/port';
import { api, errorText } from '../api';
import { canvasFrameChoices, frameRoute, type FrameChoice } from '../exportApi';
import { portApi } from '../portApi';
import { uiStore } from '../storage';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';
import { UiSelect, type UiSelectOption } from './UiSelect';
import '../styles/export.css';
import '../styles/port.css';

export interface PortDialogTarget {
  projectId: string;
  directionId: string | null;
  frameId: string | null;
}

const PLAN_DELAY_MS = 250;

function pagePath(path: string | undefined): string {
  const clean = (path ?? '').replace(/^\/+/, '');
  return clean || 'index.html';
}

function useTargets(sourceId: string): { apps: Project[] | null; source: Project | null; error: string | null } {
  const [state, setState] = useState<{ apps: Project[] | null; source: Project | null; error: string | null }>({ apps: null, source: null, error: null });
  useEffect(() => {
    let alive = true;
    api
      .listProjects()
      .then((list) => alive && setState({ apps: list.filter((p) => p.app && p.id !== sourceId), source: list.find((p) => p.id === sourceId) ?? null, error: null }))
      .catch((err: unknown) => alive && setState({ apps: [], source: null, error: errorText(err) }));
    return () => {
      alive = false;
    };
  }, [sourceId]);
  return state;
}

function usePlan(input: { sourceProjectId: string; sourceDirectionId: string | null; path: string; targetProjectId: string; route: string | null }) {
  const [plan, setPlan] = useState<{ plan: PortPlan | null; error: string | null; loading: boolean }>({ plan: null, error: null, loading: false });
  const { sourceProjectId, sourceDirectionId, path, targetProjectId, route } = input;
  useEffect(() => {
    if (!targetProjectId) return;
    let alive = true;
    setPlan((prev) => ({ ...prev, loading: true }));
    const timer = window.setTimeout(() => {
      portApi
        .plan({ sourceProjectId, sourceDirectionId: sourceDirectionId ?? undefined, path, targetProjectId, route: route ?? undefined })
        .then((next) => alive && setPlan({ plan: next, error: null, loading: false }))
        .catch((err: unknown) => alive && setPlan({ plan: null, error: errorText(err), loading: false }));
    }, PLAN_DELAY_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [sourceProjectId, sourceDirectionId, path, targetProjectId, route]);
  return plan;
}

function PlanSummary({ plan, loading, error }: { plan: PortPlan | null; loading: boolean; error: string | null }) {
  if (error) return <p className="port-note error">{error}</p>;
  if (!plan) return <p className="port-note">{loading ? 'Reading the page…' : 'Pick an app to see the plan.'}</p>;
  const cards = plan.repeats.find((r) => r.role === 'card');
  return (
    <div className="port-plan" aria-busy={loading} aria-label="Port plan">
      <div className="port-plan-row">
        <span className="port-plan-key">Content</span>
        <span className="port-plan-value">
          {plan.sections.length} sections{cards ? `, ${cards.count} cards` : ''}
          {plan.steps.length > 0 ? `, ${plan.steps.length} steps` : ''}, {plan.links.length} links
        </span>
      </div>
      <div className="port-plan-row">
        <span className="port-plan-key">Kit</span>
        <span className="port-plan-value port-kit">
          {plan.kit.length === 0 && 'No kit component fits'}
          {plan.kit.map((k) => (
            <span key={k.role} className="port-kit-chip" data-tip={k.reason}>
              {k.name}
            </span>
          ))}
        </span>
      </div>
      <div className="port-plan-row">
        <span className="port-plan-key">Tokens</span>
        <span className="port-plan-value">
          {plan.tokens.filter((t) => t.target).length} of {plan.tokens.length} map to app tokens; {plan.inlineStyles} inline styles stay out
        </span>
      </div>
      {plan.target?.routeFile && (
        <div className="port-plan-row">
          <span className="port-plan-key">File</span>
          <code className="port-plan-value mono truncate">{plan.target.routeFile}</code>
        </div>
      )}
    </div>
  );
}

function routeError(route: string, plan: PortPlan | null): string | null {
  if (!cleanPortRoute(route)) return 'Use an app path like /classes. Lower-case letters, digits and dashes; a route group in parentheses, like /(design)/classes, is allowed.';
  if (plan?.target?.routeExists) return `The app already has this route (${plan.target.routeFile}). Pick a new path.`;
  return null;
}

function Started({ result, appName, onClose }: { result: PortStartResult; appName: string; onClose: () => void }) {
  return (
    <>
      <div className="modal-body port-body">
        <p className="port-done" role="status">
          <Icon name="check" size={14} />
          Started a {PORT_LEVEL_LABEL} run in {appName} for {result.route}.
        </p>
      </div>
      <div className="modal-foot">
        <span className="port-spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="btn primary"
          data-autofocus
          onClick={() => {
            onClose();
            uiStore.set({ activeProjectId: result.projectId });
          }}
        >
          Open {appName}
        </button>
      </div>
    </>
  );
}

function firstFrameId(frames: FrameChoice[], wanted: string | null): string {
  return frames.find((f) => f.id === wanted)?.id ?? frames.find((f) => f.active)?.id ?? frames[0]?.id ?? '';
}

function usePortForm(target: PortDialogTarget) {
  const frames = useMemo(() => canvasFrameChoices(target.projectId, target.directionId), [target.projectId, target.directionId]);
  const [frameId, setFrameId] = useState(() => firstFrameId(frames, target.frameId));
  const path = pagePath((frames.find((f) => f.id === frameId) ?? frames[0])?.frame.path);
  const targets = useTargets(target.projectId);
  const [appId, setAppId] = useState('');
  const chosenApp = appId || (targets.apps?.[0]?.id ?? '');
  const [route, setRoute] = useState<string | null>(null);
  const [title, setTitle] = useState<{ path: string; title: string | null } | null>(null);
  const routeText = route ?? suggestPortRoute(path, title?.path === path ? title.title : null);
  const cleanRoute = cleanPortRoute(routeText);
  const plan = usePlan({ sourceProjectId: target.projectId, sourceDirectionId: target.directionId, path, targetProjectId: chosenApp, route: cleanRoute });
  const planSource = plan.plan?.source;
  useEffect(() => {
    if (planSource) setTitle({ path: planSource.path, title: planSource.title });
  }, [planSource]);
  const htmlSource = !targets.source || (targets.source.kind === 'html' && !targets.source.app);
  const badRoute = routeError(routeText, plan.plan);
  const ready = Boolean(chosenApp && cleanRoute) && htmlSource && !badRoute && !plan.loading && !plan.error;
  return { frames, frameId, setFrameId, path, targets, chosenApp, setAppId, routeText, setRoute, cleanRoute, plan, htmlSource, badRoute, ready };
}

type PortForm = ReturnType<typeof usePortForm>;

function AppField({ form }: { form: PortForm }) {
  const { apps, error } = form.targets;
  const options: UiSelectOption[] = (apps ?? []).map((a) => ({ value: a.id, label: a.name }));
  return (
    <div className="field">
      <span id="port-app-label">Target app</span>
      {apps?.length === 0 ? (
        <p className="port-note">{error ?? 'No attached app yet. On Home, use Open app to attach your repository, then come back.'}</p>
      ) : (
        <UiSelect aria-labelledby="port-app-label" value={form.chosenApp} options={options} onChange={form.setAppId} placeholder="Loading apps…" disabled={!apps} />
      )}
    </div>
  );
}

function FormBody({ form, error }: { form: PortForm; error: string | null }) {
  const frameOptions: UiSelectOption[] = form.frames.map((f) => ({ value: f.id, label: `${f.frame.name} · ${frameRoute(f.frame)}` }));
  return (
    <div className="modal-body port-body">
      <div className="field">
        <span id="port-frame-label">Frame</span>
        <UiSelect aria-labelledby="port-frame-label" value={form.frameId} options={frameOptions} onChange={form.setFrameId} />
      </div>
      {!form.htmlSource && <p className="port-note error">Move to app works on HTML prototype pages. Open an HTML project to use it.</p>}
      <AppField form={form} />
      <label className="field">
        <span>Route path</span>
        <input className="mono" value={form.routeText} spellCheck={false} aria-invalid={Boolean(form.badRoute)} onChange={(e) => form.setRoute(e.target.value)} />
      </label>
      {form.badRoute && <p className="port-note error">{form.badRoute}</p>}
      {form.chosenApp && <PlanSummary plan={form.plan.plan} loading={form.plan.loading} error={form.plan.error} />}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default function PortToAppDialog({ target, onClose }: { target: PortDialogTarget; onClose: () => void }) {
  const dialog = useModalDialog(onClose);
  const form = usePortForm(target);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<PortStartResult | null>(null);
  const appName = form.targets.apps?.find((a) => a.id === form.chosenApp)?.name ?? 'the app';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.ready || busy || !form.cleanRoute) return;
    setBusy(true);
    setError(null);
    portApi
      .start({ sourceProjectId: target.projectId, sourceDirectionId: target.directionId ?? undefined, path: form.path, targetProjectId: form.chosenApp, route: form.cleanRoute })
      .then(setStarted)
      .catch((err: unknown) => setError(errorText(err)))
      .finally(() => setBusy(false));
  };

  return (
    <dialog ref={dialog.ref} className="modal port-dialog" aria-label="Move to app" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Move to app</h2>
            <p>The agent rebuilds this page as one route in your app, with its kit components and token classes.</p>
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {started ? (
          <Started result={started} appName={appName} onClose={onClose} />
        ) : (
          <>
            <FormBody form={form} error={error} />
            <div className="modal-foot">
              <span className="port-foot-note">Runs at the {PORT_LEVEL_LABEL} level in the target app and writes one new route file.</span>
              <span className="port-spacer" />
              <button type="button" className="btn ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={!form.ready || busy}>
                {busy ? 'Starting…' : 'Start run'}
              </button>
            </div>
          </>
        )}
      </form>
    </dialog>
  );
}
