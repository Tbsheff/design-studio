import { Chip } from '../ai/components/ai/chip';
import type { RunCanvasChip } from '../useRunCanvas';
import { Icon } from './Icon';

export function RunContextChip({ chip }: { chip: RunCanvasChip | null | undefined }) {
  if (!chip) return null;
  const state = chip.state ? `, ${chip.state}` : '';
  const tip = `The agent works on frame ${chip.frameId} (${chip.page}${state}) and checks it there. Remove to send without it.`;
  return (
    <div className="chips run-context flex flex-wrap gap-1 px-2 pt-2">
      <Chip size="sm" className="chip max-w-full py-0.5 pr-0.5 text-muted-foreground" data-tip={tip} data-tip-side="top">
        <Icon name="frame" size={12} />
        <span className="chip-text min-w-0 truncate">
          On <span className="font-mono text-foreground">{chip.page}</span>
          {chip.state ? ` (${chip.state})` : ''}
          {chip.element ? ` · ${chip.element}` : ''}
        </span>
        <button type="button" className="icon-btn chip-x" aria-label="Remove canvas context" data-tip="Remove canvas context" onClick={chip.onRemove}>
          <Icon name="close" size={12} />
        </button>
      </Chip>
    </div>
  );
}
