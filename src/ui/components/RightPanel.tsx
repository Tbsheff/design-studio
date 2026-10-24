import { useLayoutEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { RunView } from '../runState';
import type { PanelTab } from '../usePanelTab';
import { ChatPanel } from './ChatPanel';
import { ChatSplitter } from './ChatSplitter';
import { ErrorsPanel } from './ErrorsPanel';
import { Icon, type IconName } from './Icon';
import { Inspector, inspectorEmptyReason } from './Inspector';
import { PromptBox } from './PromptBox';
import { RunDetails } from './RunDetails';
import { TokensPanel } from './TokensPanel';
import { VersionsPanel } from './VersionsPanel';
import { CommentsPanel, QueuedComposerBar } from './CommentsPanel';
import { TweaksPanel } from './TweaksPanel';
import { TodoPanel } from './TodoPanel';

interface Props {
  columnsRef: RefObject<HTMLDivElement | null>;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  chat: ComponentProps<typeof ChatPanel>;
  errors: ComponentProps<typeof ErrorsPanel>;
  prompt: ComponentProps<typeof PromptBox>;
  inspector: ComponentProps<typeof Inspector>;
  details: Omit<ComponentProps<typeof RunDetails>, 'run'> & { run: RunView | null };
  tokens: ComponentProps<typeof TokensPanel> | null;
  versions: ComponentProps<typeof VersionsPanel>;
  comments?: ComponentProps<typeof CommentsPanel>;
  tweaks?: ComponentProps<typeof TweaksPanel>;
  todos?: ComponentProps<typeof TodoPanel> | null;
}

const TABS: { id: PanelTab; label: string; icon: IconName }[] = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'design', label: 'Design', icon: 'pointer' },
  { id: 'tweaks', label: 'Tweaks', icon: 'sliders' },
  { id: 'tokens', label: 'Tokens', icon: 'token' },
  { id: 'comments', label: 'Comments', icon: 'comment' },
  { id: 'versions', label: 'Versions', icon: 'history' },
];

interface TabsProps {
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  ready: boolean;
  hasTokens: boolean;
  pending: number;
  queued?: number;
  tweaked?: number;
}

function TabBadge({ id, ready, pending, queued = 0, tweaked }: { id: PanelTab; ready: boolean; pending: number; queued?: number; tweaked?: number }) {
  if (id === 'design' && ready) return <span className="panel-tab-dot" aria-hidden="true" />;
  if (id === 'tweaks' && tweaked) return <span className="panel-tab-badge" aria-label={`${tweaked} pending`}>{tweaked}</span>;
  if (id === 'comments' && queued > 0) return <span className="panel-tab-badge" data-testid="comments-badge" aria-label={`${queued} queued`}>{queued}</span>;
  if (id === 'tokens' && pending > 0) return <span className="panel-tab-badge" aria-label={`${pending} pending`}>{pending}</span>;
  return null;
}

function fullLabelWidth(list: HTMLElement): number {
  const first = list.firstElementChild;
  const last = list.lastElementChild;
  if (!first || !last) return 0;
  const style = getComputedStyle(list);
  return last.getBoundingClientRect().right - first.getBoundingClientRect().left + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

function useCompactTabs(layoutKey: string) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const fullWidth = useRef(0);
  const [compact, setCompact] = useState(false);
  const [measuredKey, setMeasuredKey] = useState(layoutKey);
  if (measuredKey !== layoutKey) {
    setMeasuredKey(layoutKey);
    setCompact(false);
  }
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () => {
      const labelsShown = list.dataset.compact !== 'true';
      if (labelsShown) fullWidth.current = fullLabelWidth(list);
      setCompact(Math.ceil(fullWidth.current) > list.clientWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(list);
    for (const tab of list.children) observer.observe(tab);
    return () => observer.disconnect();
  }, [layoutKey]);
  return { listRef, compact: compact && measuredKey === layoutKey };
}

function PanelTabs({ tab, onTab, ready, hasTokens, pending, queued, tweaked }: TabsProps) {
  const refs = useRef<Partial<Record<PanelTab, HTMLButtonElement | null>>>({});
  const tabs = TABS.filter((t) => (t.id !== 'tokens' || hasTokens) && (t.id !== 'comments' || queued !== undefined) && (t.id !== 'tweaks' || tweaked !== undefined));
  const { listRef, compact } = useCompactTabs(`${tabs.map((t) => t.id).join(',')}|${ready}|${pending}|${queued ?? ''}|${tweaked ?? ''}`);
  const onKeyDown = (event: KeyboardEvent) => {
    const at = tabs.findIndex((t) => t.id === tab);
    const target = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = tabs[(target + tabs.length) % tabs.length]?.id ?? 'chat';
    onTab(next);
    refs.current[next]?.focus();
  };
  return (
    <div ref={listRef} className="panel-tabs" role="tablist" aria-label="Side panel" data-compact={compact} onKeyDown={onKeyDown}>
      {tabs.map((t, i) => {
        const on = tab === t.id;
        const iconOnly = compact && !on;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`panel-tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-pane-${t.id}`}
            tabIndex={on ? 0 : -1}
            className={`panel-tab ${on ? 'on' : ''} ${compact ? 'compact' : ''}`}
            data-tip={iconOnly ? t.label : undefined}
            data-tip-align={iconOnly && i === tabs.length - 1 ? 'end' : iconOnly && i === 0 ? 'start' : undefined}
            onClick={() => onTab(t.id)}
          >
            {compact && <Icon name={t.icon} />}
            <span className={iconOnly ? 'sr-only' : undefined}>{t.label}</span>
            <TabBadge id={t.id} ready={ready} pending={pending} queued={queued} tweaked={tweaked} />
          </button>
        );
      })}
    </div>
  );
}

function TabPane({ id, active, children }: { id: PanelTab; active: boolean; children: ReactNode }) {
  return (
    <div
      className={`panel-pane ${active ? '' : 'off'}`}
      role="tabpanel"
      id={`panel-pane-${id}`}
      aria-labelledby={`panel-tab-${id}`}
      aria-hidden={!active}
      inert={!active}
    >
      {children}
    </div>
  );
}

export function RightPanel(props: Props) {
  const ready = inspectorEmptyReason(props.inspector.selection, props.inspector.editable) === null;
  const tokens = props.tokens;
  const comments = props.comments;
  const tweaks = props.tweaks;
  const tab = (props.tab === 'tokens' && !tokens) || (props.tab === 'comments' && !comments) || (props.tab === 'tweaks' && !tweaks) ? 'chat' : props.tab;
  return (
    <aside className="panel right">
      <ChatSplitter columnsRef={props.columnsRef} />
      <PanelTabs tab={tab} onTab={props.onTab} ready={ready && tab !== 'design'} hasTokens={tokens !== null} pending={tokens?.draft.count ?? 0} queued={comments?.control.queued.length} tweaked={tweaks?.draft.count} />
      <div className="panel-panes">
        <TabPane id="chat" active={tab === 'chat'}>
          <ChatPanel {...props.chat} />
        </TabPane>
        <TabPane id="design" active={tab === 'design'}>
          <Inspector {...props.inspector} />
        </TabPane>
        {tweaks && (
          <TabPane id="tweaks" active={tab === 'tweaks'}>
            <TweaksPanel {...tweaks} />
          </TabPane>
        )}
        {tokens && (
          <TabPane id="tokens" active={tab === 'tokens'}>
            <TokensPanel {...tokens} />
          </TabPane>
        )}
        {comments && (
          <TabPane id="comments" active={tab === 'comments'}>
            <CommentsPanel {...comments} />
          </TabPane>
        )}
        <TabPane id="versions" active={tab === 'versions'}>
          <VersionsPanel {...props.versions} />
        </TabPane>
      </div>
      <ErrorsPanel {...props.errors} />
      {comments && tab !== 'comments' && <QueuedComposerBar control={comments.control} onShow={() => props.onTab('comments')} />}
      {props.todos && tab === 'chat' && <TodoPanel {...props.todos} />}
      <PromptBox {...props.prompt} />
      {props.details.run && <RunDetails {...props.details} run={props.details.run} />}
    </aside>
  );
}
