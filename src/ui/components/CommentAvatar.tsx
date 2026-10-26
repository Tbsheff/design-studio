import { Icon } from './Icon';

interface AvatarProps {
  initial: string | null;
  flip?: boolean;
  tone?: string;
  count?: number;
}

export function AvatarFace({ initial, flip = false, tone = 'queued', count = 0 }: AvatarProps) {
  return (
    <span className={`avatar-pin ${tone}${flip ? ' flip' : ''}`} aria-hidden="true">
      <span className="avatar-face">{initial ?? <Icon name="comment" size={12} />}</span>
      {count > 0 && <span className="avatar-count">{count > 9 ? '9+' : count}</span>}
    </span>
  );
}
