import { describe, expect, it } from 'vitest';
import { buildEnv, LOGIN_SHELL_PATH_ENV } from './sdk-driver.js';

const SOURCE = {
  HOME: '/Users/a',
  USER: 'a',
  PATH: '/usr/bin:/bin',
  ANTHROPIC_API_KEY: '',
  CLAUDE_CODE_ENTRYPOINT: 'desktop',
  ANTHROPIC_BASE_URL: 'http://proxy',
  STUDIO_PORT: '4170',
  [LOGIN_SHELL_PATH_ENV]: '/opt/nvm/bin:/usr/bin',
};

describe('agent env allowlist', () => {
  it('keeps only allowlisted keys and drops an empty API key', () => {
    expect(buildEnv(SOURCE, false)).toEqual({ HOME: '/Users/a', USER: 'a', PATH: '/usr/bin:/bin' });
  });

  it('adds the login-shell PATH only when Bash or install is allowed', () => {
    expect(buildEnv(SOURCE, true).PATH).toBe('/usr/bin:/bin:/opt/nvm/bin');
  });
});
