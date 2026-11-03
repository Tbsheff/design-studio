import { lazy, useMemo } from "react";
import type { ComponentType } from "react";

import { loadCommandLayer } from "../features/commands";

interface Prefetchable {
  fetch: () => Promise<object>;
}

interface Preloaded<Props extends object> {
  Screen: (props: Props) => React.JSX.Element;
  fetch: () => Promise<ComponentType<Props>>;
}

const IDLE_TIMEOUT_MS = 1000;
const IDLE_FALLBACK_MS = 200;

const preloadable = <Props extends object>(
  load: () => Promise<ComponentType<Props>>
): Preloaded<Props> => {
  let ready: ComponentType<Props> | null = null;

  const fetchComponent = async (): Promise<ComponentType<Props>> => {
    const component = await load();
    ready = component;

    return component;
  };

  const Lazy = lazy(async () => ({ default: await fetchComponent() }));

  const Screen = (props: Props): React.JSX.Element => {
    const Component = useMemo(() => ready ?? Lazy, []);

    return <Component {...props} />;
  };

  return { Screen, fetch: fetchComponent };
};

const studio = preloadable(async () => {
  const loaded = await import("./studio");

  return loaded.Studio;
});

const designSystems = preloadable(async () => {
  const loaded = await import("../components/DesignSystems");

  return loaded.DesignSystems;
});

const newDesignSystem = preloadable(async () => {
  const loaded = await import("../components/NewDesignSystem");

  return loaded.NewDesignSystem;
});

const Studio = studio.Screen;
const DesignSystems = designSystems.Screen;
const NewDesignSystem = newDesignSystem.Screen;

const prefetch = async (screen: Prefetchable): Promise<boolean> => {
  try {
    await screen.fetch();

    return true;
  } catch {
    return false;
  }
};

const prefetchStudio = (): Promise<boolean> => prefetch(studio);

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
  DesignSystems,
  NewDesignSystem,
  prefetchCommandLayer,
  prefetchScreensWhenIdle,
  prefetchStudio,
  Studio,
};
