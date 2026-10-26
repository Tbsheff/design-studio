import { memo } from 'react';
import type { CompiledTokenEntry } from '../../shared/contracts';
import { aliasPath, type PendingToken, type RawToken, type TokenField } from '../tokenDraft';
import { Icon } from './Icon';
import { ColorValue, DimensionValue, TextValue } from './TokenInputs';

interface RowProps {
  entry: CompiledTokenEntry;
  shown: RawToken;
  base: RawToken;
  pending: PendingToken | undefined;
  error: string | undefined;
  showDark: boolean;
  swatchFor: (value: string, dark: boolean) => string;
  onEdit: (entry: CompiledTokenEntry, field: TokenField, value: string | null) => void;
  onRevert: (path: string) => void;
}

const SHORT: Record<string, string> = { space: 'SP', radius: 'R', text: 'Aa' };

function AliasChip({ value, swatch }: { value: string; swatch: string | null }) {
  const target = aliasPath(value);
  if (!target) return null;
  return (
    <span className="tk-chip tkp-alias" data-tip={`Alias of ${target}`}>
      {swatch && <span className="tk-swatch sm" style={{ background: swatch }} aria-hidden="true" />}
      <span className="truncate">{target}</span>
    </span>
  );
}

function DarkSlot({ entry, shown, swatchFor, onEdit }: Pick<RowProps, 'entry' | 'shown' | 'swatchFor' | 'onEdit'>) {
  const name = entry.cssVar;
  if (shown.darkValue === null) {
    return (
      <button type="button" className="tkp-nodark" aria-label={`Add dark value for ${name}`} onClick={() => onEdit(entry, 'darkValue', shown.value)}>
        <Icon name="plus" size={12} />
        No dark value
      </button>
    );
  }
  return (
    <div className="tkp-dark">
      <ColorValue label={`${name} dark value`} suffix="dark" value={shown.darkValue} swatch={swatchFor(shown.darkValue, true)} onChange={(next) => onEdit(entry, 'darkValue', next)} />
      <button type="button" className="icon-btn small tkp-drop" aria-label={`Remove dark value for ${name}`} data-tip="Remove dark value" data-tip-align="end" onClick={() => onEdit(entry, 'darkValue', null)}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

function ValueEditor({ entry, shown, error, swatchFor, onEdit }: Pick<RowProps, 'entry' | 'shown' | 'error' | 'swatchFor' | 'onEdit'>) {
  const label = `${entry.cssVar} value`;
  const invalid = error !== undefined;
  const change = (next: string) => onEdit(entry, 'value', next);
  if (entry.type === 'color') return <ColorValue label={label} value={shown.value} invalid={invalid} swatch={swatchFor(shown.value, false)} onChange={change} />;
  if (entry.type === 'dimension') {
    const short = SHORT[entry.path.split('.')[0] ?? ''] ?? 'D';
    return <DimensionValue id={`tkp-${entry.path}`} label={label} short={short} value={shown.value} invalid={invalid} onChange={change} />;
  }
  return <TextValue label={label} value={shown.value} invalid={invalid} mono={entry.type === 'shadow'} onChange={change} />;
}

function rowChanged(pending: PendingToken | undefined): boolean {
  return pending !== undefined && (pending.value !== undefined || pending.darkValue !== undefined);
}

export const TokenRow = memo(function TokenRow(props: RowProps) {
  const { entry, shown, pending, error } = props;
  const changed = rowChanged(pending);
  const color = entry.type === 'color';
  const dark = color && props.showDark;
  return (
    <li className={`tkp-row ${changed ? 'changed' : ''} ${dark ? 'has-dark' : ''}`} data-token={entry.cssVar}>
      <div className="tkp-row-head">
        <span className={`tkp-mark ${changed ? 'on' : ''}`} aria-label={changed ? 'Changed, not committed' : undefined} role={changed ? 'img' : undefined} />
        <code className="tkp-name truncate" title={`${entry.cssVar} (${entry.path})${entry.description ? `: ${entry.description}` : ''}`}>
          {entry.cssVar}
        </code>
        <AliasChip value={shown.value} swatch={color ? props.swatchFor(shown.value, false) : null} />
        {changed && (
          <button type="button" className="icon-btn small tkp-revert" aria-label={`Revert ${entry.cssVar}`} data-tip={`Revert to ${props.base.value}`} data-tip-align="end" onClick={() => props.onRevert(entry.path)}>
            <Icon name="undo" size={12} />
          </button>
        )}
      </div>
      <div className="tkp-values">
        <ValueEditor entry={entry} shown={shown} error={error} swatchFor={props.swatchFor} onEdit={props.onEdit} />
        {dark && <DarkSlot entry={entry} shown={shown} swatchFor={props.swatchFor} onEdit={props.onEdit} />}
      </div>
      {error && (
        <p className="tkp-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
});
