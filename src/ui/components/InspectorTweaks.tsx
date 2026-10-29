import { useState } from 'react';
import type { TweaksDraft } from '../useTweaks';
import { Icon } from './Icon';
import { TweaksPanel } from './TweaksPanel';

export interface InspectorTweaksProps {
  draft: TweaksDraft;
  running: boolean;
  onSuggest: (prompt?: string) => void;
}

function TweaksPrompt({ running, onSuggest }: { running: boolean; onSuggest?: (prompt?: string) => void }) {
  const [text, setText] = useState('');
  const send = () => {
    if (!onSuggest || running) return;
    onSuggest(text.trim() || undefined);
    setText('');
  };
  return (
    <div className="ins-tweaks-empty">
      <p className="ins-tweaks-text">Tweaks are live controls for this design: sliders, colors, switches and menus. Drag them to try values on every frame at once, with no model call.</p>
      <div className="ins-tweaks-prompt">
        <textarea
          aria-label="Describe the tweaks you want"
          placeholder="Describe what you want to adjust and Claude will add a tweaks panel"
          rows={3}
          value={text}
          disabled={!onSuggest}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (text.trim()) send();
            }
          }}
        />
        {!text.trim() && (
          <button type="button" className="btn small ghost ins-tweaks-auto" disabled={!onSuggest || running} data-tip="Claude picks the controls" onClick={send}>
            Let Claude choose
          </button>
        )}
        <button type="button" className="icon-btn small send" aria-label="Add tweaks panel" disabled={!onSuggest || running || !text.trim()} onClick={send}>
          <Icon name="arrowUp" size={14} />
        </button>
      </div>
      {!onSuggest && <p className="ins-note">Tweaks are not available here.</p>}
    </div>
  );
}

export function InspectorTweaks({ tweaks, blocked = false }: { tweaks?: InspectorTweaksProps; blocked?: boolean }) {
  const controls = tweaks?.draft.state?.controls.length ?? 0;
  if (!tweaks || (tweaks.draft.state && controls === 0)) return <TweaksPrompt running={(tweaks?.running ?? false) || blocked} onSuggest={tweaks?.onSuggest} />;
  return <TweaksPanel draft={tweaks.draft} running={tweaks.running} onSuggest={() => tweaks.onSuggest()} />;
}
