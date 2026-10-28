import { useEffect, useState } from 'react';
import { STUDIO_TOKEN_HEADER } from '../../shared/contracts';
import type { RepoContextFile, RepoContextState } from '../../shared/repo-context';
import { Chip } from '../ai/components/ai/chip';
import { getSession } from '../session';
import { Icon } from './Icon';

const USE_NOTE: Record<RepoContextFile['use'], string | null> = {
  full: null,
  cut: 'cut',
  design_md: 'sent as DESIGN.md',
  duplicate: 'same as another file',
  import_only: 'only @ imports',
  too_large: 'too large, left out',
};

function sent(file: RepoContextFile): boolean {
  return file.use === 'full' || file.use === 'cut' || file.use === 'design_md';
}

function fileName(file: RepoContextFile): string {
  return file.path.split('/').pop() ?? file.path;
}

function tipFor(files: RepoContextFile[]): string {
  const lines = files.map((file) => {
    const note = USE_NOTE[file.use];
    return `${file.path}${note ? ` (${note})` : ''}`;
  });
  return `Each run reads these repo files: ${lines.join(', ')}. Lines that look like secrets are left out.`;
}

function useRunContext(projectId: string, directionId: string | null | undefined): RepoContextFile[] {
  const [files, setFiles] = useState<RepoContextFile[]>([]);
  useEffect(() => {
    if (!directionId) return;
    let live = true;
    const url = `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/run-context`;
    fetch(url, { headers: { [STUDIO_TOKEN_HEADER]: getSession().token } })
      .then((res) => (res.ok ? (res.json() as Promise<RepoContextState>) : null))
      .then((state) => live && setFiles(state?.files ?? []))
      .catch(() => live && setFiles([]));
    return () => {
      live = false;
    };
  }, [projectId, directionId]);
  return files;
}

export default function RepoContextChip({ projectId, directionId }: { projectId: string; directionId?: string | null }) {
  const files = useRunContext(projectId, directionId);
  const shown = files.filter(sent);
  if (!shown.length) return null;
  const names = [...new Set(shown.map(fileName))].join(', ');
  return (
    <div className="chips repo-context flex flex-wrap gap-1 px-2 pt-2">
      <Chip size="sm" className="chip max-w-full py-0.5 text-muted-foreground" data-tip={tipFor(files)} data-tip-side="top">
        <Icon name="book" size={12} />
        <span className="chip-text min-w-0 truncate">
          Repo <span className="font-mono text-foreground">{names}</span>
        </span>
      </Chip>
    </div>
  );
}
