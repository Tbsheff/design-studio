import { useEffect, useEffectEvent } from "react";

import {
  CANVAS_TOOL_EVENT,
  PRESENT_EVENT,
  RELOAD_EVENT,
  isCanvasToolId,
} from "../../platform/canvas-tool.js";
import type { ChromeHandlers } from "./use-chrome-handlers.js";

const useToolEvents = (handlers: ChromeHandlers): void => {
  const runTool = useEffectEvent((event: Event): void => {
    if (event instanceof CustomEvent && isCanvasToolId(event.detail)) {
      handlers.onTool(event.detail);
    }
  });

  const runPresent = useEffectEvent((): void => {
    handlers.onPresent("window");
  });

  const runReload = useEffectEvent((): void => {
    handlers.reload();
  });

  useEffect(() => {
    const onTool = (event: Event): void => runTool(event);
    const onPresent = (): void => runPresent();
    const onReload = (): void => runReload();

    globalThis.addEventListener(CANVAS_TOOL_EVENT, onTool);
    globalThis.addEventListener(PRESENT_EVENT, onPresent);
    globalThis.addEventListener(RELOAD_EVENT, onReload);

    return (): void => {
      globalThis.removeEventListener(CANVAS_TOOL_EVENT, onTool);
      globalThis.removeEventListener(PRESENT_EVENT, onPresent);
      globalThis.removeEventListener(RELOAD_EVENT, onReload);
    };
  }, []);
};

export { useToolEvents };
