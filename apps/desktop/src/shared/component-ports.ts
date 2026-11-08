import type {
  Direction,
  Project,
  ComponentInfo,
} from "@design-studio/contracts";
import type { PropValue } from "@design-studio/contracts/props";

interface PreviewTarget {
  id?: string | undefined;
  name?: string | undefined;
  file?: string | undefined;
  props?: Record<string, PropValue> | undefined;
}

interface PreviewComponent {
  id: string;
  name: string;
  file: string;
}

type PreviewResult =
  | {
      ok: true;
      png: Buffer;
      hash: string;
      cached: boolean;
      component: PreviewComponent;
      props: Record<string, PropValue>;
      text: string | null;
    }
  | { ok: false; reason: string; component: PreviewComponent | null };

interface ComponentPreviews {
  render: (
    project: Project,
    direction: Direction,
    target: PreviewTarget
  ) => Promise<PreviewResult>;
}

interface ComponentService {
  list: (project: Project, direction: Direction) => Promise<ComponentInfo[]>;
  thumb: (
    project: Project,
    direction: Direction,
    id: string,
    version: string
  ) => Promise<Buffer | null>;
}

export type {
  ComponentPreviews,
  ComponentService,
  PreviewComponent,
  PreviewResult,
  PreviewTarget,
};
