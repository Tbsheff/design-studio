import { Icon } from './Icon';

export function ComposerComments({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  const noun = count === 1 ? 'comment' : 'comments';
  return (
    <div className="composer-comments" data-testid="composer-comments">
      <span className="chip" data-tip={`The run gets each ${noun.replace(/s$/, '')} with its element, and the run summary offers to resolve them.`} data-tip-side="top">
        <Icon name="comment" size={12} />
        {count} {noun} linked
        <button type="button" className="icon-btn small" aria-label={`Unlink the ${noun}`} onClick={onClear}>
          <Icon name="close" size={12} />
        </button>
      </span>
    </div>
  );
}
