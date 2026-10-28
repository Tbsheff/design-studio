type PickOutcome = { kind: 'picked'; path: string } | { kind: 'canceled' } | { kind: 'unsupported' };

interface DesktopPicker {
  pickFolder?: (options: { title: string; defaultPath?: string }) => Promise<string | null>;
}

function desktopPicker(): DesktopPicker['pickFolder'] {
  return (window as unknown as { studioDesktop?: DesktopPicker }).studioDesktop?.pickFolder;
}

export function hasNativePicker(): boolean {
  return typeof desktopPicker() === 'function';
}

export async function pickFolder(options: { title: string; defaultPath?: string }): Promise<PickOutcome> {
  const native = desktopPicker();
  if (!native) return { kind: 'unsupported' };
  const chosen = await native({ title: options.title, ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}) });
  return chosen ? { kind: 'picked', path: chosen } : { kind: 'canceled' };
}
