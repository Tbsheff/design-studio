import { EXPAND_SCROLL_ROOT } from "./scroll-root.probe.js";

export async function expandScrollRoot(page: {
  evaluate<T>(expression: string): Promise<T>;
}): Promise<number> {
  return page.evaluate<number>(EXPAND_SCROLL_ROOT).catch(() => 0);
}
