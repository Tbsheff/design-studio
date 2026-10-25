import { binding, keyParts, shortcutLabel, type KeyId } from '../../shared/keymap';

export const IS_MAC = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test((navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.userAgent);

export function Keys({ keys, className }: { keys: string; className?: string }) {
  return (
    <span className={`keys${className ? ` ${className}` : ''}`}>
      {keyParts(keys, IS_MAC).map((part, index) => (
        <kbd key={`${part}-${index}`}>{part}</kbd>
      ))}
    </span>
  );
}

export function KeyHint({ id }: { id: KeyId }) {
  const first = binding(id).keys[0];
  return first ? <Keys keys={first} /> : null;
}

export function tipWithKey(label: string, id: KeyId): string {
  return `${label}  ${shortcutLabel(id, IS_MAC)}`;
}
