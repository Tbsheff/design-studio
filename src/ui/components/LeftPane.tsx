import type { ComponentProps, ReactNode, RefObject } from 'react';
import type { RunView } from '../runState';
import type { PanelTab } from '../usePanelTab';
import { ChatPanel } from './ChatPanel';
import { ChatSplitter } from './ChatSplitter';
import { ErrorsPanel } from './ErrorsPanel';
import { Icon } from './Icon';
import { Inspector } from './Inspector';
import { PromptBox } from './PromptBox';
import { RunDetails } from './RunDetails';
import { TokensPanel } from './TokensPanel';
import { ComponentsPanel } from './ComponentsPanel';
import { VersionsPanel } from './VersionsPanel';
import { CommentsPanel, QueuedComposerBar } from './CommentsPanel';
import { TweaksPanel } from './TweaksPanel';
import { TodoPanel } from './TodoPanel';

interface Props {
  columnsRef: RefObject<HTMLDivElement | null>;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  header: ReactNode;
  system: ReactNode;
  layersSlot: (el: HTMLDivElement | null) => void;
  chat: ComponentProps<typeof ChatPanel>;
  errors: ComponentProps<typeof ErrorsPanel>;
  prompt: ComponentProps<typeof PromptBox>;
  inspector: ComponentProps<typeof Inspector>;
  details: Omit<ComponentProps<typeof RunDetails>, 'run'> & { run: RunView | null };
  tokens: ComponentProps<typeof TokensPanel> | null;
  components?: ComponentProps<typeof ComponentsPanel>;
  versions: ComponentProps<typeof VersionsPanel>;
  comments?: ComponentProps<typeof CommentsPanel>;
  tweaks?: ComponentProps<typeof TweaksPanel>;
  todos?: ComponentProps<typeof TodoPanel> | null;
}

const SHEET_TITLES: Partial<Record<PanelTab, string>> = {
  versions: 'Versions',
  tokens: 'Tokens',
  components: 'Components',
  tweaks: 'Tweaks',
  system: 'Design system',
  comments: 'Comments',
};

export function visiblePane(tab: PanelTab, has: { tokens: boolean; comments: boolean; tweaks: boolean; components: boolean }): PanelTab {
  const missing: Partial<Record<PanelTab, boolean>> = { tokens: !has.tokens, comments: !has.comments, tweaks: !has.tweaks, components: !has.components };
  return missing[tab] ? 'chat' : tab;
}

function SheetHead({ title, onClose, children }: { title: string; onClose: () => void; children?: ReactNode }) {
  return (
    <div className="pane-sheet-head">
      <h2 className="pane-sheet-title">{title}</h2>
      {children}
      <button type="button" className="icon-btn small" aria-label={`Close ${title}`} data-tip="Back to chat" data-tip-align="end" onClick={onClose}>
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function Sheet(props: Props & { tab: PanelTab }) {
  const close = () => props.onTab('chat');
  const title = SHEET_TITLES[props.tab] ?? '';
  const body = (() => {
    switch (props.tab) {
      case 'versions':
        return <VersionsPanel {...props.versions} />;
      case 'tokens':
        return props.tokens ? <TokensPanel {...props.tokens} /> : null;
      case 'components':
        return props.components ? <ComponentsPanel {...props.components} /> : null;
      case 'tweaks':
        return props.tweaks ? <TweaksPanel {...props.tweaks} /> : null;
      case 'comments':
        return props.comments ? <CommentsPanel {...props.comments} /> : null;
      case 'system':
        return <div className="pane-system">{props.system}</div>;
      default:
        return null;
    }
  })();
  return (
    <section className={`pane-sheet pane-sheet-${props.tab}`} aria-label={title}>
      <SheetHead title={title} onClose={close} />
      <div className="pane-sheet-body">{body}</div>
    </section>
  );
}

function EditPane({ slot, children, onClose }: { slot: (el: HTMLDivElement | null) => void; children: ReactNode; onClose: () => void }) {
  return (
    <section className="pane-edit" aria-label="Edit">
      <SheetHead title="Edit" onClose={onClose} />
      <div className="pane-edit-layers" ref={slot} />
      <div className="pane-edit-inspector">{children}</div>
    </section>
  );
}

export function LeftPane(props: Props) {
  const tab = visiblePane(props.tab, { tokens: props.tokens !== null, comments: Boolean(props.comments), tweaks: Boolean(props.tweaks), components: Boolean(props.components) });
  const chat = tab === 'chat';
  const edit = tab === 'design';
  const sheet = !chat && !edit;
  const comments = props.comments;
  return (
    <aside className="pane-left" data-mode={tab}>
      {props.header}
      <div className="pane-body">
        <div className="pane-chat" hidden={!chat}>
          <ChatPanel {...props.chat} />
        </div>
        <div className="pane-edit-host" hidden={!edit}>
          <EditPane slot={props.layersSlot} onClose={() => props.onTab('chat')}>
            <Inspector {...props.inspector} />
          </EditPane>
        </div>
        {sheet && <Sheet {...props} tab={tab} />}
      </div>
      <ErrorsPanel {...props.errors} />
      {comments && tab !== 'comments' && <QueuedComposerBar control={comments.control} onShow={() => props.onTab('comments')} />}
      {props.todos && chat && <TodoPanel {...props.todos} />}
      <div className="pane-composer" hidden={!chat}>
        <PromptBox {...props.prompt} />
      </div>
      {props.details.run && <RunDetails {...props.details} run={props.details.run} />}
      <ChatSplitter columnsRef={props.columnsRef} />
    </aside>
  );
}
