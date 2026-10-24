import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('fetch loopback allow', () => {
  it('is off by default and on only with STUDIO_FETCH_ALLOW_LOOPBACK=1 outside the packaged app', () => {
    vi.stubEnv('STUDIO_RESOURCES_DIR', '');
    vi.stubEnv('STUDIO_FETCH_ALLOW_LOOPBACK', '');
    expect(loadConfig().fetchAllowLoopback).toBe(false);
    vi.stubEnv('STUDIO_FETCH_ALLOW_LOOPBACK', 'true');
    expect(loadConfig().fetchAllowLoopback).toBe(false);
    vi.stubEnv('STUDIO_FETCH_ALLOW_LOOPBACK', '1');
    expect(loadConfig().fetchAllowLoopback).toBe(true);
    vi.stubEnv('STUDIO_RESOURCES_DIR', '/Applications/Design Studio.app/Contents/Resources');
    expect(loadConfig().fetchAllowLoopback).toBe(false);
  });
});
