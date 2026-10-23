const { spawnSync } = require('node:child_process');
const path = require('node:path');

function signature(appPath) {
  const out = spawnSync('codesign', ['-dv', appPath], { encoding: 'utf8' });
  const text = `${out.stdout}${out.stderr}`;
  const team = /TeamIdentifier=(\S+)/.exec(text)?.[1] ?? 'not set';
  return { adhoc: /Signature=adhoc/.test(text) || team === 'not set', team };
}

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const profile = process.env.STUDIO_NOTARY_PROFILE;
  if (!profile) {
    console.log('[notarize] skipped: STUDIO_NOTARY_PROFILE is not set');
    return;
  }
  const { adhoc, team } = signature(appPath);
  if (adhoc) {
    console.log(`[notarize] skipped: ${appPath} has an ad-hoc signature (team ${team}); notarization needs a Developer ID build`);
    return;
  }
  const { notarize } = require('@electron/notarize');
  console.log(`[notarize] submitting ${appPath} (team ${team}) with keychain profile "${profile}"`);
  await notarize({ appPath, keychainProfile: profile });
  console.log('[notarize] accepted and stapled');
};
