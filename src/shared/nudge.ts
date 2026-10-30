const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const BIG_STEP = 10;

export function nudgeStepOf(event: { key: string; altKey: boolean; shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }): { dx: number; dy: number } | null {
  if (event.altKey || event.metaKey || event.ctrlKey) return null;
  const dir = ARROWS[event.key];
  if (!dir) return null;
  const step = event.shiftKey ? BIG_STEP : 1;
  return { dx: dir[0] * step, dy: dir[1] * step };
}
