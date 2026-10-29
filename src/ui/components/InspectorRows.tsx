import { memo, useState, type KeyboardEvent } from 'react';
import type { DirectStyleProperty, SelectionContext } from '../../shared/contracts';
import { textEditability } from '../cssValues';
import { sameEditValues, type DirectEdit } from '../useDirectEdit';
import { DataTextNote, useInspectorApp } from './InspectorShared';

function useRowKeys(onCommit: () => void, onRevert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onRevert();
    }
  };
}

export function ContentRow({ selection, edit }: { selection: SelectionContext; edit: DirectEdit }) {
  const state = textEditability(selection);
  const onKeyDown = useRowKeys(edit.commit, edit.revertText);
  const data = useInspectorApp().element?.textFromData;
  if (data) return <DataTextNote data={data} selection={selection} edit={edit} />;
  if (state !== 'ok') {
    return (
      <div className="ins-field wide readonly">
        <span className="ins-scrub static">Content</span>
        <span className="ins-value">{state === 'children' ? 'Has child elements' : 'Too long to edit here'}</span>
      </div>
    );
  }
  return (
    <div className="ins-field wide">
      <label htmlFor="ins-content" className="ins-scrub static">
        Content
      </label>
      <input
        id="ins-content"
        className="ins-input"
        aria-label="Text content"
        value={edit.text}
        spellCheck={false}
        data-tip={edit.text}
        onChange={(event) => edit.previewText(event.target.value)}
        onBlur={edit.commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

const UNSAFE = /[;{}<>\\]/;

export function CssTextRow({ prop, label, short, edit, placeholder, wide = true }: { prop: DirectStyleProperty; label: string; short: string; edit: DirectEdit; placeholder: string; wide?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const value = edit.values[prop];
  const shown = text ?? (value === 'none' ? '' : value);
  const id = `ins-${prop}`;
  const commit = () => {
    if (text !== null) {
      const next = text.trim();
      if (UNSAFE.test(next)) edit.revert([prop]);
      else edit.preview({ [prop]: next === '' ? 'none' : next });
    }
    setText(null);
    edit.commit();
  };
  const onKeyDown = useRowKeys(commit, () => {
    setText(null);
    edit.revert([prop]);
  });
  return (
    <div className={`ins-field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <input
        id={id}
        className="ins-input mono"
        aria-label={label}
        value={shown}
        spellCheck={false}
        autoComplete="off"
        placeholder={edit.mixed.has(prop) ? 'Mixed' : placeholder}
        onChange={(event) => {
          setText(event.target.value);
          const next = event.target.value.trim();
          if (next !== '' && !UNSAFE.test(next)) edit.preview({ [prop]: next });
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
}

function hasLine(value: string, line: string): boolean {
  return value.split(/\s+/).includes(line);
}

function toggleLine(value: string, line: string): string {
  const parts = value.split(/\s+/).filter((part) => part !== '' && part !== 'none');
  const next = parts.includes(line) ? parts.filter((part) => part !== line) : [...parts, line];
  return next.length === 0 ? 'none' : next.join(' ');
}

function TextStyleTogglesView({ edit }: { edit: DirectEdit }) {
  const italic = edit.values['font-style'] === 'italic' || edit.values['font-style'] === 'oblique';
  const decoration = edit.values['text-decoration-line'];
  const write = (patch: Partial<Record<DirectStyleProperty, string>>) => {
    edit.preview(patch);
    edit.commit();
  };
  const items = [
    { key: 'i', label: 'Italic', on: italic, run: () => write({ 'font-style': italic ? 'normal' : 'italic' }), glyph: <em>I</em> },
    { key: 'u', label: 'Underline', on: hasLine(decoration, 'underline'), run: () => write({ 'text-decoration-line': toggleLine(decoration, 'underline') }), glyph: <u>U</u> },
    { key: 's', label: 'Strikethrough', on: hasLine(decoration, 'line-through'), run: () => write({ 'text-decoration-line': toggleLine(decoration, 'line-through') }), glyph: <s>S</s> },
  ];
  return (
    <div className="ins-field ins-toggles" role="group" aria-label="Text style">
      {items.map((item) => (
        <button key={item.key} type="button" className={item.on ? 'on' : ''} aria-label={item.label} aria-pressed={item.on} data-tip={item.label} onClick={item.run}>
          {item.glyph}
        </button>
      ))}
    </div>
  );
}

export const TextStyleToggles = memo(TextStyleTogglesView, (a, b) => sameEditValues(a.edit, b.edit, ['font-style', 'text-decoration-line']));
