import { sharedSourceOf, type SharedSource } from '../../shared/app.js';
import type { Project, SelectionContext, SourceLoc } from '../../shared/contracts.js';
import { elementClassInfo } from './class-info.js';

export const EDIT_TARGETS = ['use', 'component', 'element'] as const;
export type EditTarget = (typeof EDIT_TARGETS)[number];

type Sourced = Pick<SelectionContext, 'source' | 'usedAt' | 'usedBy' | 'tag'> & { source: SourceLoc };

export type EditSite =
  | { kind: 'use'; source: SourceLoc; component: string; shared: SharedSource; explicit: boolean }
  | { kind: 'component'; source: SourceLoc; tag: string; shared: SharedSource | null; explicit: boolean };

export interface EditSiteAsk {
  selector: string;
  target?: EditTarget | undefined;
  classes: boolean;
}

export interface EditSiteScope {
  workTree: string;
  project: Pick<Project, 'app' | 'kind'>;
}

export function locText(loc: SourceLoc): string {
  return `${loc.file}:${loc.line}:${loc.col}`;
}

async function forwardsClassName(scope: EditSiteScope, loc: SourceLoc): Promise<boolean> {
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc).catch(() => null);
  return info?.element?.forwardsClassName === true;
}

function componentSite(element: Sourced, shared: SharedSource | null, explicit: boolean): EditSite {
  return { kind: 'component', source: element.source, tag: element.tag, shared, explicit };
}

export async function chooseEditSite(scope: EditSiteScope, element: Sourced, ask: EditSiteAsk): Promise<EditSite | { error: string }> {
  const shared = scope.project.app ? sharedSourceOf(element, scope.project.app.appDir) : null;
  if (ask.target === 'component' || ask.target === 'element') return componentSite(element, shared, true);
  const use = shared?.use && shared.name ? { loc: shared.use, name: shared.name } : null;
  if (!use || !shared) {
    if (ask.target === 'use') return { error: `${ask.selector} is not the outer element of a shared component use, so there is no use site to edit. Leave out target to edit ${element.source.file}.` };
    return componentSite(element, shared, false);
  }
  if (ask.classes && !(await forwardsClassName(scope, element.source))) {
    return { error: `<${use.name}> in ${element.source.file} does not pass its className prop to ${ask.selector}, so a class at ${locText(use.loc)} would not reach it. Pass target "component" to change ${element.source.file} (every <${use.name}>), or use set_props for a variant or size.` };
  }
  return { kind: 'use', source: use.loc, component: use.name, shared, explicit: ask.target === 'use' };
}

export async function textComesFromData(scope: EditSiteScope, loc: SourceLoc): Promise<boolean> {
  const info = await elementClassInfo(scope.workTree, scope.project.kind, loc).catch(() => null);
  return Boolean(info?.element?.textFromData);
}

export function siteRequest(site: EditSite): { source: SourceLoc; component: string } | { source: SourceLoc; tag: string } {
  return site.kind === 'use' ? { source: site.source, component: site.component } : { source: site.source, tag: site.tag };
}

export function siteNote(site: EditSite): string | null {
  if (site.kind === 'use') return `Edited this use of <${site.component}> at ${locText(site.source)}; ${site.shared.file} did not change. Pass target "component" to change every ${site.component} instead.`;
  if (!site.shared) return null;
  const what = site.shared.name ? `every ${site.shared.name}` : `every use of ${site.shared.file}`;
  const back = site.shared.use ? ` Leave out target to change only the use at ${locText(site.shared.use)}.` : '';
  return `${site.shared.file} is a shared component, so this edit changes ${what}.${back}`;
}
