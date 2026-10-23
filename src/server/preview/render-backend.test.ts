import { describe, expect, it } from 'vitest';
import { isRenderRequest, isRenderResponse, RENDER_MESSAGE } from '../../shared/render-rpc.js';
import { chooseBackend } from './render-backend.js';

describe('chooseBackend', () => {
  it('uses playwright for npm start and tests', () => {
    expect(chooseBackend({})).toBe('playwright');
  });

  it('uses electron when the app gives the server an IPC channel or a socket', () => {
    expect(chooseBackend({ STUDIO_RENDER_IPC: '1' })).toBe('electron');
    expect(chooseBackend({ STUDIO_RENDER_SOCKET: '/tmp/render.sock' })).toBe('electron');
  });

  it('lets STUDIO_RENDER_BACKEND force either backend and rejects other values', () => {
    expect(chooseBackend({ STUDIO_RENDER_BACKEND: 'playwright', STUDIO_RENDER_IPC: '1' })).toBe('playwright');
    expect(chooseBackend({ STUDIO_RENDER_BACKEND: 'electron' })).toBe('electron');
    expect(() => chooseBackend({ STUDIO_RENDER_BACKEND: 'chrome' })).toThrow(/must be/);
  });
});

describe('render RPC messages', () => {
  it('accepts only known operations with an args object', () => {
    expect(isRenderRequest({ type: RENDER_MESSAGE, id: 1, op: 'open', args: { width: 390, height: 844 } })).toBe(true);
    expect(isRenderRequest({ type: RENDER_MESSAGE, id: 1, op: 'exec', args: {} })).toBe(false);
    expect(isRenderRequest({ type: RENDER_MESSAGE, id: 1.5, op: 'open', args: {} })).toBe(false);
    expect(isRenderRequest({ type: 'other', id: 1, op: 'open', args: {} })).toBe(false);
    expect(isRenderRequest(null)).toBe(false);
  });

  it('accepts responses with an id and an ok flag', () => {
    expect(isRenderResponse({ type: RENDER_MESSAGE, id: 3, ok: false, error: 'x' })).toBe(true);
    expect(isRenderResponse({ type: RENDER_MESSAGE, id: 3 })).toBe(false);
  });
});
