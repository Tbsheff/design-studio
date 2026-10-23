import type { Direction, Project } from '../../shared/contracts';
import type { RunMap } from '../runState';
import type { BuildError, FilesChange } from '../useStudioData';
import type { VariationsState } from '../useVariations';
import { Icon } from './Icon';
import { VariationBriefCard } from './VariationBriefCard';
import { VariationBar, VariationsGrid } from './VariationsGrid';

export function VariationsTop({ state, project, direction }: { state: VariationsState; project: Project; direction: Direction | null }) {
  return (
    <>
      {direction?.variation && !state.gridGroupId && <VariationBar direction={direction} onShow={() => direction.variation && state.openGrid(direction.variation.groupId)} />}
      {state.kept && !state.gridGroupId && (
        <div className="variations-notice alert inline" role="status" data-testid="variation-kept">
          <span>{state.kept}</span>
          <button className="icon-btn small" aria-label="Dismiss" onClick={() => state.keepNotice(null)}>
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
      {state.draft && (
        <div className="variation-card-layer">
          <VariationBriefCard project={project} draft={state.draft} onEdit={state.editBrief} onRemove={state.removeBrief} onStart={state.start} onSkip={state.skip} onDismiss={state.dismiss} />
        </div>
      )}
    </>
  );
}

interface GridProps {
  state: VariationsState;
  project: Project;
  runs: RunMap;
  lastChange: FilesChange | null;
  currentDirectionId: string | null;
  setDirectionId: (id: string) => void;
  onError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
}

export function variationsGrid(props: GridProps) {
  const { state, project } = props;
  const groupId = state.gridGroupId;
  if (!groupId) return undefined;
  const nameOf = (id: string) => project.directions.find((direction) => direction.id === id)?.name ?? 'this variation';
  return (
    <VariationsGrid
      project={project}
      groupId={groupId}
      runs={props.runs}
      lastChange={props.lastChange}
      currentDirectionId={props.currentDirectionId}
      notice={state.notice}
      onClearNotice={state.clearNotice}
      onOpen={(id) => {
        props.setDirectionId(id);
        state.closeGrid();
      }}
      onKeep={(id) => {
        props.setDirectionId(id);
        state.closeGrid();
        state.keepNotice(`Kept ${nameOf(id)}. The other variations stay in Versions as directions.`);
      }}
      onClose={state.closeGrid}
      onCancelAll={() => state.cancelAll(groupId)}
      onMix={async (from, to, element) => {
        await state.mix(from, to, element, project.settings.defaultLevel);
      }}
      onError={props.onError}
    />
  );
}
