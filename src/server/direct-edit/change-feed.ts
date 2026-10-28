export interface SourceFileChange {
  relative: string;
  before: string;
  after: string;
}

export interface SourceChange {
  projectId: string;
  directionId: string;
  files: SourceFileChange[];
}

type Listener = (change: SourceChange) => void;

const listeners = new Set<Listener>();

export function onSourceChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSourceChange(change: SourceChange): void {
  if (change.files.length === 0) return;
  for (const listener of listeners) {
    try {
      listener(change);
    } catch (error) {
      console.error('[source-change] listener failed', error);
    }
  }
}
