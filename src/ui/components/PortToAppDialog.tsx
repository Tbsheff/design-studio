import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { cleanPortRoute, PORT_LEVEL_LABEL, suggestPortRoute, type PortFlowPage, type PortFlowPlan, type PortKitMatch, type PortStartResult } from '../../shared/port';
import { api, errorText } from '../api';
import { canvasFrameChoices, frameRoute, type FrameChoice } from '../exportApi';
import { portApi } from '../portApi';
import { uiStore } from '../storage';
import { useModalDialog } from '../usePopover';
import { Icon } from './Icon';
import { UiSelect, type UiSelectOption } from './UiSelect';
import '../styles/export.css';
import '../styles/port.css';
import '../styles/port-flow.css';

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

interface FlowState {
  flow: PortFlowPlan | null;
  error: string | null;
  loading: boolean;
}

function usePlan(input: { sourceProjectId: string; sourceDirectionId: string | null; path: string; targetProjectId: string; route: string | null }): FlowState {
  const [plan, setPlan] = useState<FlowState>({ flow: null, error: null, loading: false });
  const { sourceProjectId, sourceDirectionId, path, targetProjectId, route } = input;
  useEffect(() => {
    if (!targetProjectId) return;
    let alive = true;
    setPlan((prev) => ({ ...prev, loading: true }));
    const timer = window.setTimeout(() => {
      portApi
        .flowPlan({ sourceProjectId, sourceDirectionId: sourceDirectionId ?? undefined, path, targetProjectId, route: route ?? undefined })
        .then((next) => alive && setPlan({ flow: next, error: null, loading: false }))
        .catch((err: unknown) => alive && setPlan({ flow: null, error: errorText(err), loading: false }));
    }, PLAN_DELAY_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [sourceProjectId, sourceDirectionId, path, targetProjectId, route]);
  return plan;
}

function kitOf(pages: PortFlowPage[]): PortKitMatch[] {
  const seen = new Map<string, PortKitMatch>();
  for (const page of pages) for (const k of page.plan.kit) if (!seen.has(k.name)) seen.set(k.name, k);
  return [...seen.values()];
}

function contentText(pages: PortFlowPage[], links: number): string {
  const first = pages[0]?.plan;
  if (!first) return 'No page picked';
  if (pages.length === 1) {
    const cards = first.repeats.find((r) => r.role === 'card');
    return `${first.sections.length} sections${cards ? `, ${cards.count} cards` : ''}${first.steps.length > 0 ? `, ${first.steps.length} steps` : ''}, ${first.links.length} links`;
  }
  const sections = pages.reduce((sum, page) => sum + page.plan.sections.length, 0);
  return `${pages.length} pages, ${sections} sections, ${links} links between pages`;
}

function PlanSummary({ pages, links, loading, error }: { pages: PortFlowPage[]; links: number; loading: boolean; error: string | null }) {
  if (error) return <p className="port-note error">{error}</p>;
  const first = pages[0]?.plan;
  if (!first) return <p className="port-note">{loading ? 'Reading the pages…' : 'Pick an app to see the plan.'}</p>;
  const kit = kitOf(pages);
  return (
    <div className="port-plan" aria-busy={loading} aria-label="Port plan">
      <div className="port-plan-row">
        <span className="port-plan-key">Content</span>
        <span className="port-plan-value">{contentText(pages, links)}</span>
      </div>
      <div className="port-plan-row">
        <span className="port-plan-key">Kit</span>
        <span className="port-plan-value port-kit">
          {kit.length === 0 && 'No kit component fits'}
          {kit.map((k) => (
            <span key={k.role} className="port-kit-chip" data-tip={k.reason}>
              {k.name}
            </span>
          ))}
        </span>
      </div>
      <div className="port-plan-row">
        <span className="port-plan-key">Tokens</span>
        <span className="port-plan-value">
          {first.tokens.filter((t) => t.target).length} of {first.tokens.length} map to app tokens; {first.inlineStyles} inline styles stay out
        </span>
      </div>
      {pages.length === 1 && first.target?.routeFile && (
        <div className="port-plan-row">
          <span className="port-plan-key">File</span>
          <code className="port-plan-value mono truncate">{first.target.routeFile}</code>
        </div>
      )}
    </div>
  );
}

function routeError(route: string, picked: PortFlowPage[]): string | null {
  if (!cleanPortRoute(route)) return 'Use an app path like /classes. Lower-case letters, digits and dashes; a route group in parentheses, like /(design)/classes, is allowed.';
  const taken = picked.filter((page) => page.routeExists);
  if (taken.length === 1) return `The app already has the route ${taken[0]?.url} (${taken[0]?.routeFile}). Pick a new path.`;
  if (taken.length > 1) return `The app already has ${taken.length} of these routes (${taken.map((page) => page.url).join(', ')}). Pick a new path.`;
  return null;
}

function startedText(result: PortStartResult): string {
  const count = result.routes?.length ?? 1;
  return count > 1 ? `${count} routes under ${result.route}` : result.route;
}

function Started({ result, appName, onClose }: { result: PortStartResult; appName: string; onClose: () => void }) {
  return (
    <>
      <div className="modal-body port-body">
        <p className="port-done" role="status">
          <Icon name="check" size={14} />
          Started a {PORT_LEVEL_LABEL} run in {appName} for {startedText(result)}.
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

function usePagePicks(flow: PortFlowPlan | null) {
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set());
  const all = flow?.pages ?? [];
  const picked = all.filter((page) => !off.has(page.path));
  const toggle = (page: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  const links = flow ? flow.links.filter((link) => !off.has(link.from) && !off.has(link.page) && link.from !== link.page).length : 0;
  return { all, picked, toggle, links };
}

function useEntryTitle(flow: PortFlowPlan | null, setTitle: (title: { path: string; title: string | null }) => void): void {
  const entry = flow?.source.entry;
  const entryTitle = flow?.pages.find((page) => page.path === entry)?.title ?? null;
  useEffect(() => {
    if (entry) setTitle({ path: entry, title: entryTitle });
  }, [entry, entryTitle, setTitle]);
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
  useEntryTitle(plan.flow, setTitle);
  const pages = usePagePicks(plan.flow);
  const htmlSource = !targets.source || (targets.source.kind === 'html' && !targets.source.app);
  const badRoute = routeError(routeText, pages.picked);
  const ready = Boolean(chosenApp && cleanRoute) && pages.picked.length > 0 && htmlSource && !badRoute && !plan.loading && !plan.error;
  return { frames, frameId, setFrameId, path, targets, chosenApp, setAppId, routeText, setRoute, cleanRoute, plan, pages, htmlSource, badRoute, ready };
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

function PageRow({ page, checked, onToggle }: { page: PortFlowPage; checked: boolean; onToggle: () => void }) {
  return (
    <label className="export-frame port-page" data-tip={page.routeFile ?? undefined}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="port-page-name truncate">{page.path}</span>
      <span className="port-page-route mono truncate">{page.url}</span>
      {page.routeExists && checked && <span className="port-page-taken">Exists</span>}
    </label>
  );
}

function PageList({ form }: { form: PortForm }) {
  const { all, picked, toggle } = form.pages;
  if (all.length < 2) return null;
  const on = new Set(picked.map((page) => page.path));
  return (
    <fieldset className="export-field port-pages">
      <legend className="export-label">
        Pages in this flow · {picked.length} of {all.length}
      </legend>
      {all.map((page) => (
        <PageRow key={page.path} page={page} checked={on.has(page.path)} onToggle={() => toggle(page.path)} />
      ))}
    </fieldset>
  );
}

function FormBody({ form, error }: { form: PortForm; error: string | null }) {
  const frameOptions: UiSelectOption[] = form.frames.map((f) => ({ value: f.id, label: `${f.frame.name} · ${frameRoute(f.frame)}` }));
  const multi = form.pages.all.length > 1;
  return (
    <div className="modal-body port-body">
      <div className="field">
        <span id="port-frame-label">{multi ? 'First page' : 'Frame'}</span>
        <UiSelect aria-labelledby="port-frame-label" value={form.frameId} options={frameOptions} onChange={form.setFrameId} />
      </div>
      {!form.htmlSource && <p className="port-note error">Move to app works on HTML prototype pages. Open an HTML project to use it.</p>}
      <AppField form={form} />
      <label className="field">
        <span>{multi ? 'Base route' : 'Route path'}</span>
        <input className="mono" value={form.routeText} spellCheck={false} aria-invalid={Boolean(form.badRoute)} onChange={(e) => form.setRoute(e.target.value)} />
      </label>
      {form.badRoute && <p className="port-note error">{form.badRoute}</p>}
      {form.chosenApp && <PageList form={form} />}
      {form.chosenApp && <PlanSummary pages={form.pages.picked} links={form.pages.links} loading={form.plan.loading} error={form.plan.error} />}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function startPaths(form: PortForm): string[] | undefined {
  const paths = form.pages.picked.map((page) => page.path);
  return paths.length === 1 && paths[0] === form.path ? undefined : paths;
}

export default function PortToAppDialog({ target, onClose }: { target: PortDialogTarget; onClose: () => void }) {
  const dialog = useModalDialog(onClose);
  const form = usePortForm(target);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<PortStartResult | null>(null);
  const appName = form.targets.apps?.find((a) => a.id === form.chosenApp)?.name ?? 'the app';
  const count = form.pages.picked.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.ready || busy || !form.cleanRoute) return;
    setBusy(true);
    setError(null);
    const paths = startPaths(form);
    portApi
      .start({ sourceProjectId: target.projectId, sourceDirectionId: target.directionId ?? undefined, path: form.path, ...(paths ? { paths } : {}), targetProjectId: form.chosenApp, route: form.cleanRoute })
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
            <p>The agent rebuilds the checked pages as routes in your app, with its kit components and token classes, and links them to each other.</p>
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
              <span className="port-foot-note">
                Runs at the {PORT_LEVEL_LABEL} level in the target app and writes {count > 1 ? `${count} new route files` : 'one new route file'}.
              </span>
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
