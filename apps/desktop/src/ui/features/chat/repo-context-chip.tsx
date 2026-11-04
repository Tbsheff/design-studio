import { useEffect, useState } from "react";

import type {
  RepoContextFile,
  RepoContextState,
} from "../../../shared/repo-context.js";
import { Chip } from "../../ai/components/ai/chip.js";
import { Icon } from "@design-studio/ui";
import { getJson } from "../../platform/http.js";

const USE_NOTE: Record<RepoContextFile["use"], string | null> = {
  cut: "cut",
  design_md: "sent as DESIGN.md",
  duplicate: "same as another file",
  full: null,
  import_only: "only @ imports",
  too_large: "too large, left out",
};

const sent = (file: RepoContextFile): boolean =>
  file.use === "full" || file.use === "cut" || file.use === "design_md";

const fileName = (file: RepoContextFile): string =>
  file.path.split("/").pop() ?? file.path;

const label = (file: RepoContextFile): string => {
  const note = USE_NOTE[file.use];

  return `${file.path}${note ? ` (${note})` : ""}`;
};

const tipFor = (files: RepoContextFile[]): string => {
  const read = files.filter(sent).map(label).join(", ");

  const skipped = files
    .filter((file) => !sent(file))
    .map(label)
    .join(", ");

  return `Each run reads ${read}.${skipped ? ` Not sent: ${skipped}.` : ""} Lines that look like secrets are left out.`;
};

const useRunContext = (
  projectId: string,
  directionId: string | null | undefined
): RepoContextFile[] => {
  const [files, setFiles] = useState<RepoContextFile[]>([]);
  useEffect(() => {
    if (!directionId) {
      return;
    }

    let live = true;
    const url = `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/run-context`;

    const read = async (): Promise<void> => {
      try {
        const state = await getJson<RepoContextState>(url);

        if (live) {
          setFiles(state?.files ?? []);
        }
      } catch {
        if (live) {
          setFiles([]);
        }
      }
    };

    void read();

    return () => {
      live = false;
    };
  }, [projectId, directionId]);

  return files;
};

export default function RepoContextChip({
  projectId,
  directionId,
}: {
  projectId: string;
  directionId?: string | null;
}) {
  const files = useRunContext(projectId, directionId);
  const shown = files.filter(sent);

  if (shown.length === 0) {
    return null;
  }

  const names = [...new Set(shown.map(fileName))].join(", ");

  return (
    <div className="chips repo-context flex flex-wrap gap-1 px-2 pt-2">
      <Chip
        size="sm"
        className="chip max-w-full py-0.5 text-muted-foreground"
        data-tip={tipFor(files)}
        data-tip-side="top"
      >
        <Icon name="book" size={12} />
        <span className="chip-text min-w-0 truncate">
          Repo <span className="font-mono text-foreground">{names}</span>
        </span>
      </Chip>
    </div>
  );
}
