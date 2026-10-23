import { ApiError, api } from './api';

type PickOutcome = { kind: 'picked'; path: string } | { kind: 'canceled' } | { kind: 'unsupported' };

interface DesktopPicker {
  pickFolder?: (options: { title: string; defaultPath?: string }) => Promise<string | null>;
}

function desktopPicker(): DesktopPicker['pickFolder'] {
  return (window as unknown as { studioDesktop?: DesktopPicker }).studioDesktop?.pickFolder;
}

export async function pickFolder(options: { title: string; defaultPath?: string }): Promise<PickOutcome> {
  const input = { title: options.title, ...(options.defaultPath ? { defaultPath: options.defaultPath } : {}) };
  const native = desktopPicker();
  if (native) {
    const chosen = await native(input);
    return chosen ? { kind: 'picked', path: chosen } : { kind: 'canceled' };
  }
  try {
    const chosen = await api.pickFolder(input);
    return chosen ? { kind: 'picked', path: chosen } : { kind: 'canceled' };
  } catch (error) {
    if (error instanceof ApiError && error.status === 501) return { kind: 'unsupported' };
    throw error;
  }
}
