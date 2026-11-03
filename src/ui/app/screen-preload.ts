import { createElement, lazy } from "react";
import type { ComponentType, ReactElement } from "react";

interface Prefetchable {
  fetch: () => Promise<object>;
}

interface Preloaded<Props extends object> {
  Screen: (props: Props) => ReactElement;
  fetch: () => Promise<ComponentType<Props>>;
}

interface ComponentSlot<Props extends object> {
  component: ComponentType<Props> | null;
}

const IDLE_TIMEOUT_MS = 1000;
const IDLE_FALLBACK_MS = 200;

const preloadable = <Props extends object>(
  load: () => Promise<ComponentType<Props>>
): Preloaded<Props> => {
  const loaded: ComponentSlot<Props> = { component: null };
  const shown: ComponentSlot<Props> = { component: null };

  const fetchComponent = async (): Promise<ComponentType<Props>> => {
    const component = await load();

    loaded.component = component;

    return component;
  };

  const lazyScreen = lazy(async () => ({ default: await fetchComponent() }));

  const screen = (props: Props): ReactElement => {
    shown.component ??= loaded.component ?? lazyScreen;

    return createElement(shown.component, props);
  };

  return { Screen: screen, fetch: fetchComponent };
};

const studio = preloadable(async () => {
  const loaded = await import("./studio");

  return loaded.Studio;
});

const designSystems = preloadable(async () => {
  const loaded = await import("../features/design-system");

  return loaded.loadDesignSystems();
});

const newDesignSystem = preloadable(async () => {
  const loaded = await import("../features/design-system");

  return loaded.loadNewDesignSystem();
});

const prefetch = async (screen: Prefetchable): Promise<boolean> => {
  try {
    await screen.fetch();

    return true;
  } catch {
    return false;
  }
};

const prefetchStudio = (): Promise<boolean> => prefetch(studio);

const loadCommandLayer = async (): Promise<object> => {
  const loaded = await import("../features/commands");

  return loaded.loadCommandLayer();
};

const prefetchCommandLayer = (): Promise<boolean> =>
  prefetch({ fetch: loadCommandLayer });

const prefetchAll = (): void => {
  void prefetchStudio();
  void prefetch(designSystems);
  void prefetch(newDesignSystem);
  void prefetchCommandLayer();
};

const prefetchScreensWhenIdle = (): void => {
  if ("requestIdleCallback" in globalThis) {
    globalThis.requestIdleCallback(prefetchAll, { timeout: IDLE_TIMEOUT_MS });

    return;
  }

  setTimeout(prefetchAll, IDLE_FALLBACK_MS);
};

export {
  designSystems,
  newDesignSystem,
  prefetchCommandLayer,
  prefetchScreensWhenIdle,
  prefetchStudio,
  studio,
};
