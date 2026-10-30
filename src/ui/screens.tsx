import { lazy, useState, type ComponentType } from 'react';

function preloadable<P extends object>(load: () => Promise<ComponentType<P>>) {
  let ready: ComponentType<P> | null = null;
  const fetch = (): Promise<ComponentType<P>> =>
    load().then((component) => {
      ready = component;
      return component;
    });
  const Lazy = lazy(() => fetch().then((component) => ({ default: component })));
  function Screen(props: P) {
    const [Component] = useState<ComponentType<P>>(() => ready ?? Lazy);
    return <Component {...props} />;
  }
  return { fetch, Screen };
}

const studio = preloadable(() => import('./components/Studio').then((m) => m.Studio));
const designSystems = preloadable(() => import('./components/DesignSystems').then((m) => m.DesignSystems));
const newDesignSystem = preloadable(() => import('./components/NewDesignSystem').then((m) => m.NewDesignSystem));

const layer = preloadable(() => import('./commands/CommandLayer').then((m) => m.default));

export const Studio = studio.Screen;
export const CommandLayer = layer.Screen;
export const DesignSystems = designSystems.Screen;
export const NewDesignSystem = newDesignSystem.Screen;

export function prefetchStudio(): Promise<unknown> {
  return studio.fetch().catch(() => undefined);
}

export function prefetchCommandLayer(): void {
  layer.fetch().catch(() => undefined);
}

export function prefetchScreensWhenIdle(): void {
  const run = () => {
    void prefetchStudio();
    void designSystems.fetch().catch(() => undefined);
    void newDesignSystem.fetch().catch(() => undefined);
    prefetchCommandLayer();
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1000 });
  else setTimeout(run, 200);
}
