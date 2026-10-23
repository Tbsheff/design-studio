import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import type { Direction, Project, RunSummary, StudioEvent, Version, WorkTreeStatus } from '../../src/shared/contracts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PORT = 4380;
const PREVIEW_PORT = 4381;
const VITE_BASE = 6400;
const BASE = `http://127.0.0.1:${PORT}`;
const MODEL = 'claude-haiku-5-5';
const OUT = path.join(ROOT, 'verification', process.env.AC_OUT ?? 'ac-core-real.json');
const ONLY = new Set((process.env.AC_PHASES ?? '').split(',').filter(Boolean));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const results: Record<string, unknown> = { startedAt: new Date().toISOString(), model: MODEL };
const allRuns = new Map<string, RunSummary>();

function save(): void {
  mkdirSync(path.dirname(OUT), { recursive: true });
  results.totalReportedCostUsd = [...allRuns.values()].reduce((sum, run) => sum + run.costUsd, 0);
  results.runCount = allRuns.size;
  writeFileSync(OUT, `${JSON.stringify(results, null, 2)}\n`);
}

function log(message: string): void {
  console.log(`[ac-real] ${message}`);
}

async function waitFor<T>(label: string, fn: () => Promise<T | null>, timeoutMs: number, intervalMs = 250): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn().catch(() => null);
    if (value !== null) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await sleep(intervalMs);
  }
}

function hashTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out[path.relative(dir, full)] = createHash('sha256').update(readFileSync(full)).digest('hex');
    }
  };
  walk(dir);
  return out;
}

function processTree(rootPid: number): { pid: number; command: string }[] {
  const rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid=,command='], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ pid: Number(match[1]), ppid: Number(match[2]), command: match[3] ?? '' }));
  const keep = new Set([rootPid]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of rows) {
      if (!keep.has(row.pid) && keep.has(row.ppid)) {
        keep.add(row.pid);
        grew = true;
      }
    }
  }
  return rows.filter((row) => keep.has(row.pid) && row.pid !== rootPid).map(({ pid, command }) => ({ pid, command }));
}

function agentProcesses(rootPid: number): { pid: number; command: string }[] {
  return processTree(rootPid).filter((row) => /claude-agent-sdk/.test(row.command));
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio ac core real ')));
  const dataDir = path.join(work, 'data');
  results.dataDir = dataDir;
  const serverLog = path.join(work, 'server.log');
  results.serverLog = serverLog;
  const logStream = createWriteStream(serverLog);
  const env: Record<string, string | undefined> = { ...process.env, STUDIO_AGENT: 'sdk', STUDIO_DATA_DIR: dataDir, STUDIO_PORT: String(PORT), STUDIO_PREVIEW_PORT: String(PREVIEW_PORT), STUDIO_VITE_PORT_BASE: String(VITE_BASE) };
  delete env.ANTHROPIC_API_KEY;
  const server = spawn(path.join(ROOT, 'node_modules', '.bin', 'tsx'), ['src/server/index.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);
  const serverPid = server.pid ?? 0;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    await waitFor('server', async () => ((await fetch(`${BASE}/`)).ok ? true : null), 60_000);
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(BASE);
    const token = (await page.locator('meta[name="studio-token"]').getAttribute('content')) ?? '';
    const call = async <T>(method: string, route: string, body?: unknown): Promise<T> => {
      const res = await fetch(`${BASE}${route}`, { method, headers: { 'x-studio-token': token, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!res.ok) throw new Error(`${method} ${route} ${res.status} ${await res.text()}`);
      return (await res.json()) as T;
    };
    const getRun = (runId: string) => call<{ summary: RunSummary; events: StudioEvent[] }>('GET', `/api/runs/${runId}`);
    const finished = async (runId: string, timeoutMs = 300_000): Promise<{ summary: RunSummary; events: StudioEvent[] }> => {
      const run = await waitFor(`run ${runId}`, async () => {
        const current = await getRun(runId);
        return current.summary.status === 'running' ? null : current;
      }, timeoutMs, 300);
      allRuns.set(runId, run.summary);
      save();
      return run;
    };
    const project = (pid: string) => call<Project>('GET', `/api/projects/${pid}`);
    const direction = async (pid: string, did: string): Promise<Direction> => {
      const found = (await project(pid)).directions.find((candidate) => candidate.id === did);
      if (!found) throw new Error(`direction ${did} missing`);
      return found;
    };
    const startRun = (pid: string, did: string, prompt: string) => call<{ runId: string }>('POST', `/api/projects/${pid}/d/${did}/runs`, { prompt, mode: 'edit' });
    const openProject = async (pid: string): Promise<void> => {
      await page.evaluate((id) => localStorage.setItem('design-studio.ui.v1', JSON.stringify({ activeProjectId: id })), pid);
      await page.reload();
      await page.locator('.topbar').waitFor();
    };
    const runBrief = (summary: RunSummary) => ({
      id: summary.id,
      status: summary.status,
      costUsd: summary.costUsd,
      durationMs: summary.durationMs,
      sessionId: summary.sessionId,
      tools: summary.toolCalls.map((tool) => `${tool.name}${tool.isError ? '(error)' : ''}`),
      error: summary.error,
      finalText: summary.finalText.slice(0, 300),
    });
    const phase = async (name: string, body: () => Promise<void>): Promise<void> => {
      if (ONLY.size && !ONLY.has(name)) return;
      log(`phase ${name}`);
      try {
        await body();
      } catch (error) {
        results[`${name}.error`] = error instanceof Error ? error.stack ?? error.message : String(error);
        log(`phase ${name} error: ${String(error)}`);
      }
      save();
    };

    let pid = '';
    let mainId = '';
    let mainTree = '';

    type Finished = Awaited<ReturnType<typeof finished>>;
    type UiSample = { t: number; runs: number; textLen: number; tools: number; status: string };
    const firstH1 = (html: string): string | null => html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim() ?? null;

    const ac11Run1 = async (): Promise<{ run1: Finished; sessionAfter1: string | null }> => {
      const created = await call<{ project: Project; runId: string }>('POST', '/api/projects', {
        prompt: 'A minimal page with only one h1 and one short paragraph, no other sections. The secret word is PAPAYA. Make the h1 say hello. Do not write the secret word into any file until I ask you to.',
        kind: 'html',
        settings: { model: MODEL, maxBudgetUsd: 0.3, maxTurns: 15 },
      });
      pid = created.project.id;
      const main = created.project.directions[0] as Direction;
      mainId = main.id;
      mainTree = main.workTree;
      const run1 = await finished(created.runId);
      const tree1 = hashTree(mainTree);
      const papayaOnDisk = Object.keys(tree1).filter((file) => /papaya/i.test(readFileSync(path.join(mainTree, file), 'utf8')));
      const h1Run1 = firstH1(readFileSync(path.join(mainTree, 'index.html'), 'utf8'));
      const sessionAfter1 = (await direction(pid, mainId)).sessionId;
      results.ac11_run1 = { ...runBrief(run1.summary), h1: h1Run1, papayaFilesAfterRun1: papayaOnDisk, directionSession: sessionAfter1 };
      log(`run1 ${run1.summary.status} h1=${h1Run1} papayaFiles=${papayaOnDisk.length}`);
      return { run1, sessionAfter1 };
    };

    const installUiObserver = async (): Promise<void> => {
      await page.evaluate(`(() => {
        window.__acLog = [];
        const snap = () => {
          const runs = document.querySelectorAll('.chat .run');
          const r = runs[runs.length - 1];
          if (!r) return;
          const body = r.querySelector('.msg.assistant .msg-body');
          const st = r.querySelector('.run-foot .status');
          window.__acLog.push({ t: Date.now(), runs: runs.length, textLen: body ? body.textContent.length : 0, tools: r.querySelectorAll('.tool-row').length, status: st ? st.className.replace('status', '').trim() : '' });
        };
        new MutationObserver(snap).observe(document.querySelector('.chat'), { subtree: true, childList: true, characterData: true, attributes: true });
      })()`);
    };

    const sendSecondPrompt = async (prompt2: string): Promise<string> => {
      await page.getByPlaceholder('Describe a change').fill(prompt2);
      await page.getByRole('button', { name: 'Send' }).click();
      return waitFor('run2 id', async () => {
        const runs = await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`);
        return runs.find((run) => run.request.prompt === prompt2)?.id ?? null;
      }, 30_000);
    };

    const recordAc10 = (run2: Finished, run2Id: string, mine: UiSample[]): void => {
      const finishedTs = run2.events.find((event) => event.type === 'run.finished')?.ts ?? 0;
      const firstFinishedInUi = mine.find((entry) => entry.status !== 'running' && entry.status !== '')?.t ?? null;
      const whileRunning = mine.filter((entry) => entry.status === 'running');
      const textGrowth = whileRunning.reduce((acc, entry) => (entry.textLen > acc.last ? { last: entry.textLen, steps: acc.steps + 1 } : acc), { last: 0, steps: 0 });
      const firstText = whileRunning.find((entry) => entry.textLen > 0)?.t ?? null;
      const firstTool = whileRunning.find((entry) => entry.tools > 0)?.t ?? null;
      const deltas = run2.events.filter((event) => event.type === 'run.text.delta');
      const toolStarts = run2.events.filter((event) => event.type === 'run.tool.started');
      results.ac10 = {
        runId: run2Id,
        deltaEvents: deltas.length,
        toolStartedEvents: toolStarts.length,
        firstDeltaBeforeFinishedMs: deltas[0] ? finishedTs - deltas[0].ts : null,
        uiFirstTextBeforeServerFinishedMs: firstText ? finishedTs - firstText : null,
        uiFirstToolRowBeforeServerFinishedMs: firstTool ? finishedTs - firstTool : null,
        uiTextGrowthStepsWhileRunning: textGrowth.steps,
        uiFirstFinishedStatusAt: firstFinishedInUi ? firstFinishedInUi - finishedTs : null,
        uiSamples: mine.length,
      };
      log(`ac10 ${JSON.stringify(results.ac10)}`);
    };

    const ac10Run2 = async (): Promise<Finished> => {
      await openProject(pid);
      await page.frameLocator('iframe.frame.front').locator('h1').first().waitFor({ timeout: 30_000 });
      const runsBefore = await page.locator('.chat .run').count();
      await installUiObserver();
      const run2Id = await sendSecondPrompt('Change the h1 text to the secret word I told you');
      const run2 = await finished(run2Id);
      await sleep(1500);
      const uiLog = (await page.evaluate('window.__acLog')) as UiSample[];
      recordAc10(run2, run2Id, uiLog.filter((entry) => entry.runs === runsBefore + 1));
      return run2;
    };

    const recordAc11Run2 = async (run1: Finished, run2: Finished, sessionAfter1: string | null): Promise<void> => {
      const h1Run2 = firstH1(readFileSync(path.join(mainTree, 'index.html'), 'utf8'));
      const frameH1 = (await page.frameLocator('iframe.frame.front').locator('h1').first().textContent())?.trim() ?? null;
      const sessionAfter2 = (await direction(pid, mainId)).sessionId;
      const resumeFallback = readFileSync(serverLog, 'utf8').includes('retrying without resume');
      results.ac11_run2 = { ...runBrief(run2.summary), h1File: h1Run2, h1Preview: frameH1, directionSession: sessionAfter2, sameSession: run1.summary.sessionId !== null && run1.summary.sessionId === run2.summary.sessionId && sessionAfter1 === sessionAfter2, resumeFallbackLogged: resumeFallback };
      log(`run2 ${run2.summary.status} h1=${h1Run2} preview=${frameH1} same=${String((results.ac11_run2 as { sameSession: boolean }).sameSession)}`);
    };

    const recordAc15 = async (): Promise<void> => {
      const runRow = page.locator('.chat .run').last();
      await runRow.getByRole('button', { name: 'Details' }).click();
      const drawer = page.getByRole('dialog', { name: 'Run details' });
      await drawer.waitFor();
      const kv = (await drawer.locator('dl.kv > div').evaluateAll((rows) => rows.map((row) => [row.querySelector('dt')?.textContent ?? '', row.querySelector('dd')?.textContent ?? '']))) as [string, string][];
      const heading = (await drawer.locator('h4').first().textContent()) ?? '';
      const toolRows = await drawer.locator('tbody tr').count();
      results.ac15 = { drawer: Object.fromEntries(kv), toolHeading: heading, toolRows };
      await page.screenshot({ path: path.join(ROOT, 'verification', 'ac-core-ac15-details.png') });
      await drawer.getByRole('button', { name: 'Close' }).click();
      log(`ac15 ${JSON.stringify(results.ac15)}`);
    };

    await phase('ac11-ac10-ac15', async () => {
      const { run1, sessionAfter1 } = await ac11Run1();
      const run2 = await ac10Run2();
      await recordAc11Run2(run1, run2, sessionAfter1);
      await recordAc15();
    });

    await phase('ac12', async () => {
      const head = (await direction(pid, mainId)).headVersionId ?? '';
      const b = await call<Direction>('POST', `/api/projects/${pid}/directions`, { fromVersionId: head, name: 'Direction B' });
      const mainBefore = hashTree(mainTree);
      const { runId } = await startRun(pid, b.id, "Change the paragraph text to exactly: Direction B paragraph. Change nothing else.");
      const run = await finished(runId);
      const bNow = await direction(pid, b.id);
      const mainNow = await direction(pid, mainId);
      const bHtml = readFileSync(path.join(bNow.workTree, 'index.html'), 'utf8');
      results.ac12 = {
        run: runBrief(run.summary),
        mainSession: mainNow.sessionId,
        bSession: bNow.sessionId,
        sessionsDiffer: bNow.sessionId !== null && mainNow.sessionId !== null && bNow.sessionId !== mainNow.sessionId,
        mainWorkTree: mainNow.workTree,
        bWorkTree: bNow.workTree,
        workTreesDiffer: realpathSync(bNow.workTree) !== realpathSync(mainNow.workTree),
        bHasEdit: bHtml.includes('Direction B paragraph'),
        mainUnchanged: JSON.stringify(hashTree(mainTree)) === JSON.stringify(mainBefore),
      };
      results.ac12_bId = b.id;
      log(`ac12 ${JSON.stringify(results.ac12)}`);
    });

    await phase('ac13', async () => {
      await openProject(pid);
      await page.locator('.list-item').filter({ hasText: 'Main' }).click();
      const headBefore = (await direction(pid, mainId)).headVersionId;
      const versionsBefore = await call<Version[]>('GET', `/api/projects/${pid}/d/${mainId}/versions`);
      const cancelCase = async (label: string, prompt: string, trigger: 'time' | 'tool' | 'write'): Promise<Record<string, unknown>> => {
        const t0 = Date.now();
        if (trigger === 'time') {
          await page.getByPlaceholder('Describe a change').fill(prompt);
          await page.getByRole('button', { name: 'Send' }).click();
        } else {
          await startRun(pid, mainId, prompt);
        }
        const runId = await waitFor('run id', async () => (await call<RunSummary[]>('GET', `/api/projects/${pid}/runs`)).find((run) => run.request.prompt === prompt)?.id ?? null, 20_000, 100);
        let agentsWhileRunning: { pid: number; command: string }[] = [];
        let toolAtCancel: string | null = null;
        if (trigger === 'time') {
          await waitFor('agent process', async () => {
            agentsWhileRunning = agentProcesses(serverPid);
            return agentsWhileRunning.length ? true : null;
          }, 2_500, 100).catch(() => undefined);
          const wait = 1500 - (Date.now() - t0);
          if (wait > 0) await sleep(wait);
          agentsWhileRunning = agentsWhileRunning.length ? agentsWhileRunning : agentProcesses(serverPid);
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        } else {
          const started = await waitFor('tool start', async () => {
            const current = await getRun(runId);
            if (current.summary.status !== 'running') throw new Error(`run ended before any tool: ${current.summary.status}`);
            const tool = current.events.find((event) => event.type === 'run.tool.started' && (trigger === 'tool' || event.name === 'Write' || event.name === 'Edit'));
            return tool && tool.type === 'run.tool.started' ? tool : null;
          }, 120_000, 50);
          toolAtCancel = started.name;
          agentsWhileRunning = agentProcesses(serverPid);
          await call('POST', `/api/runs/${runId}/cancel`);
        }
        const cancelAt = Date.now();
        const run = await finished(runId, 30_000);
        const finishedEvent = run.events.find((event) => event.type === 'run.finished');
        await sleep(Math.max(0, cancelAt + 2000 - Date.now()));
        const cancelPids = new Set(agentsWhileRunning.map((row) => row.pid));
        const agentsAfter2s = agentProcesses(serverPid);
        const sameAfter2s = agentsAfter2s.filter((row) => cancelPids.has(row.pid)).length;
        let goneAfterMs: number | null = null;
        const pollUntil = Date.now() + 20_000;
        while (Date.now() < pollUntil) {
          if (!agentProcesses(serverPid).some((row) => cancelPids.has(row.pid))) {
            goneAfterMs = Date.now() - cancelAt;
            break;
          }
          await sleep(250);
        }
        const hashAt2s = hashTree(mainTree);
        await sleep(Math.max(0, cancelAt + 6000 - Date.now()));
        const hashAt6s = hashTree(mainTree);
        const toolFinished = run.events.filter((event) => event.type === 'run.tool.finished').map((event) => (event.type === 'run.tool.finished' ? `${event.isError ? 'error' : 'ok'}:${event.summary}` : ''));
        const status = await call<WorkTreeStatus>('GET', `/api/projects/${pid}/d/${mainId}/status`);
        const outcome = {
          label,
          trigger,
          cancelAfterStartMs: cancelAt - t0,
          toolAtCancel,
          status: run.summary.status,
          versionId: run.summary.versionId,
          cancelToFinishedMs: finishedEvent ? finishedEvent.ts - cancelAt : null,
          agentProcessesWhileRunning: agentsWhileRunning.length,
          agentProcessesAfter2s: agentsAfter2s.length,
          canceledAgentPidsAliveAfter2s: sameAfter2s,
          canceledAgentGoneAfterMs: goneAfterMs,
          agentPidsAtCancel: [...cancelPids],
          agentPidsAfter2s: agentsAfter2s.map((row) => row.pid),
          agentCommandSample: agentsWhileRunning[0]?.command.slice(-120) ?? null,
          noWritesBetween2sAnd6s: JSON.stringify(hashAt2s) === JSON.stringify(hashAt6s),
          toolFinished,
          headUnchanged: (await direction(pid, mainId)).headVersionId === headBefore,
          workTreeDirty: status.dirty,
          changed: status.changed,
          reportedCostUsd: run.summary.costUsd,
        };
        if (status.dirty) await call('POST', `/api/projects/${pid}/d/${mainId}/discard`);
        return outcome;
      };
      const early = await cancelCase('cancel at ~1.5s', 'Rewrite the page as a long twelve-section landing page for a bicycle repair shop with detailed copy in every section.', 'time');
      log(`ac13 early ${JSON.stringify(early)}`);
      const duringTool = await cancelCase('cancel during tool use', 'Read index.html, then use the Write tool to replace it with a long eight-section page about a bicycle repair shop, then call the render check.', 'tool');
      log(`ac13 tool ${JSON.stringify(duringTool)}`);
      const duringWrite = await cancelCase('cancel when Write starts', 'Use the Write tool to replace index.html with a long eight-section page about a bicycle repair shop with detailed copy in every section, then call the render check.', 'write');
      log(`ac13 write ${JSON.stringify(duringWrite)}`);
      const versionsAfter = await call<Version[]>('GET', `/api/projects/${pid}/d/${mainId}/versions`);
      results.ac13 = { early, duringTool, duringWrite, versionsBefore: versionsBefore.length, versionsAfter: versionsAfter.length };
    });

    await phase('ac16-tools', async () => {
      const b = await direction(pid, String(results.ac12_bId ?? mainId));
      const bashPrompt = 'Use the Bash tool to run the shell command `ls -la` in the current folder and paste its raw output. If you have no Bash tool, reply with exactly NO_BASH and do nothing else.';
      const bash = await finished((await startRun(pid, b.id, bashPrompt)).runId);
      const bashEvents = bash.events.filter((event) => event.type === 'run.tool.started' && event.name === 'Bash').length;
      results.ac16_bash = { ...runBrief(bash.summary), bashToolCalls: bash.summary.toolCalls.filter((tool) => tool.name === 'Bash').length, bashEvents };
      log(`ac16 bash ${JSON.stringify(results.ac16_bash)}`);

      const escapeTarget = path.resolve(b.workTree, '..', 'escape.txt');
      const escapePrompt = 'Sandbox test: call the Write tool exactly once with file_path set to the relative path ../escape.txt and content "escaped". Then call the Write tool once more with the absolute file_path ' + escapeTarget + ' and the same content. Report the tool results verbatim. Do nothing else.';
      const escape = await finished((await startRun(pid, b.id, escapePrompt)).runId);
      const found = execFileSync('find', [work, '-name', 'escape.txt'], { encoding: 'utf8' }).trim();
      results.ac16_escape = {
        ...runBrief(escape.summary),
        escapeTarget,
        escapeTargetExists: existsSync(escapeTarget),
        escapeFilesFound: found ? found.split('\n') : [],
        writeCalls: escape.summary.toolCalls.filter((tool) => tool.name === 'Write').map((tool) => ({ input: (tool.input as { file_path?: string }).file_path, isError: tool.isError })),
        denials: escape.events.filter((event) => event.type === 'run.tool.finished' && event.isError).map((event) => (event.type === 'run.tool.finished' ? event.summary : '')),
      };
      log(`ac16 escape ${JSON.stringify(results.ac16_escape)}`);
    });

    await phase('ac16-escape2', async () => {
      const tree = (await direction(pid, mainId)).workTree;
      const outsideDir = path.join(work, 'outside target');
      mkdirSync(outsideDir, { recursive: true });
      symlinkSync(outsideDir, path.join(tree, 'shared'), 'dir');
      const prompts = [
        'Create a new file at ../escape.txt containing the single word escaped. Use the Write tool with that exact relative file_path.',
        'Create a new file shared/escape.txt containing the single word escaped. Use the Write tool with that exact relative file_path.',
      ];
      const cases = [];
      for (const prompt of prompts) {
        const run = await finished((await startRun(pid, mainId, prompt)).runId);
        cases.push({
          prompt,
          ...runBrief(run.summary),
          writeCalls: run.summary.toolCalls.filter((tool) => tool.name === 'Write' || tool.name === 'Edit').map((tool) => ({ input: (tool.input as { file_path?: string }).file_path, isError: tool.isError })),
          denials: run.events.filter((event) => event.type === 'run.tool.finished' && event.isError).map((event) => (event.type === 'run.tool.finished' ? event.summary : '')),
        });
        const status = await call<WorkTreeStatus>('GET', `/api/projects/${pid}/d/${mainId}/status`);
        if (status.dirty) await call('POST', `/api/projects/${pid}/d/${mainId}/discard`);
      }
      const found = execFileSync('find', [work, '-name', 'escape.txt'], { encoding: 'utf8' }).trim();
      results.ac16_escape2 = { cases, escapeFilesFound: found ? found.split('\n') : [], outsideDirFiles: readdirSync(outsideDir), parentEscape: existsSync(path.resolve(tree, '..', 'escape.txt')) };
      log(`ac16 escape2 ${JSON.stringify(results.ac16_escape2)}`);
    });

    await phase('ac16-budget', async () => {
      const created = await call<{ project: Project; runId: string }>('POST', '/api/projects', { prompt: 'A landing page for a small florist', kind: 'html', settings: { model: MODEL, maxBudgetUsd: 0.001, maxTurns: 15 } });
      const run = await finished(created.runId);
      const versions = await call<Version[]>('GET', `/api/projects/${created.project.id}/d/main/versions`);
      results.ac16_budget = { ...runBrief(run.summary), settings: created.project.settings, versions: versions.map((version) => version.meta.kind) };
      await openProject(created.project.id);
      results.ac16_budget_ui = await page.locator('.chat .run').last().locator('.run-foot .status').textContent();
      log(`ac16 budget ${JSON.stringify(results.ac16_budget)} ui=${String(results.ac16_budget_ui)}`);
    });
  } finally {
    save();
    await browser.close();
    server.kill('SIGTERM');
    await sleep(1000);
    log(`total reported cost $${Number(results.totalReportedCostUsd ?? 0).toFixed(4)} over ${allRuns.size} runs`);
  }
}

main().catch((error: unknown) => {
  console.error('[ac-real] failed', error);
  save();
  process.exit(1);
});
