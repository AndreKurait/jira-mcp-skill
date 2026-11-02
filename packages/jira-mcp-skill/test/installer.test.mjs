import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { install, agentConfigPath, generateMcpConfig } from '../build/installer.js';
import { VERSION } from '../build/version.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const cli = path.join(packageRoot, 'build', 'cli.js');
const settings = { jiraUrl: 'https://example.atlassian.net', email: 'you@example.com', token: 'test-token-never-log' };
const { isNewerVersion } = createRequire(import.meta.url)('../build/version-hook.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jira installer '));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function write(target, data) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof data === 'string' ? data : JSON.stringify(data));
}
function environment(extra = {}) {
  const env = {};
  for (const key of ['PATH', 'SystemRoot', 'ComSpec', 'PATHEXT']) if (process.env[key]) env[key] = process.env[key];
  return { ...env, JIRA_MCP_SKILL_DISABLE_UPDATE_CHECK: '1', ...extra };
}
function run(root, args, extra = {}, command = cli) {
  return spawnSync(process.execPath, [command, '--config-root', root, ...args], {
    encoding: 'utf8', env: environment(extra), timeout: 10000,
  });
}
function read(target) { return JSON.parse(fs.readFileSync(target, 'utf8')); }

// Every installation test explicitly supplies its own temporary configuration root.
test('preserves unrelated settings and configures only explicitly selected clients', t => {
  const root = fixture(t);
  const target = agentConfigPath(root, 'cursor');
  write(target, { custom: { enabled: true }, mcpServers: { other: { command: 'other' }, 'mcp-atlassian': { old: true } } });
  install({ root, agents: ['cursor'], settings });
  const config = read(target);
  assert.deepEqual(config.custom, { enabled: true });
  assert.deepEqual(config.mcpServers.other, { command: 'other' });
  assert.equal(config.mcpServers['mcp-atlassian'].env.JIRA_API_TOKEN, settings.token);
  assert.equal(config.mcpServers['mcp-atlassian'].env.CONFLUENCE_URL, 'https://example.atlassian.net/wiki');
  assert.equal(fs.existsSync(path.join(root, '.kiro')), false);
  if (process.platform !== 'win32') assert.equal(fs.statSync(target).mode & 0o777, 0o600);
});

test('Claude configurations use the selected platform layout without creating other clients', t => {
  for (const [platform, directories] of [
    ['darwin', ['Library', 'Application Support', 'Claude']],
    ['win32', ['AppData', 'Roaming', 'Claude']],
    ['linux', ['.config', 'Claude']],
  ]) {
    const root = fixture(t);
    install({ root, agents: ['claude'], settings, platform });
    const config = read(path.join(root, ...directories, 'claude_desktop_config.json'));
    assert.equal(config.mcpServers['mcp-atlassian'].env.JIRA_API_TOKEN, settings.token);
    assert.equal(fs.existsSync(path.join(root, '.kiro')), false);
    assert.equal(fs.existsSync(path.join(root, '.cursor')), false);
  }
});

test('invalid existing JSON aborts the whole preflight without replacing anything', t => {
  const root = fixture(t);
  const cursor = agentConfigPath(root, 'cursor');
  const kiro = agentConfigPath(root, 'kiro');
  write(cursor, { mcpServers: { other: {} } });
  write(kiro, '{ malformed');
  const before = fs.readFileSync(cursor);
  assert.throws(() => install({ root, agents: ['cursor', 'kiro'], settings }), /Invalid JSON/);
  assert.deepEqual(fs.readFileSync(cursor), before);
  assert.equal(fs.readFileSync(kiro, 'utf8'), '{ malformed');
  assert.equal(fs.existsSync(path.join(root, '.jira-mcp-skill')), false);
});

for (const operation of ['writeFileSync', 'renameSync']) {
  test(`${operation} failure survives a secondary temporary-file cleanup failure`, t => {
    const root = fixture(t);
    const target = agentConfigPath(root, 'cursor');
    write(target, { mcpServers: { other: { command: 'preserve-me' } } });
    const before = fs.readFileSync(target);
    const original = Object.assign(new Error(`simulated ${operation} failure`), { code: 'EACCES' });
    t.mock.method(fs, operation, () => { throw original; });
    const cleanup = t.mock.method(fs, 'unlinkSync', () => {
      throw Object.assign(new Error('simulated cleanup failure'), { code: 'EPERM' });
    });

    assert.throws(() => install({ root, agents: ['cursor'], settings }), error => error === original);
    assert.equal(cleanup.mock.callCount(), 1);
    assert.deepEqual(fs.readFileSync(target), before);
  });
}

test('non-object configs and server maps are rejected without modification', t => {
  for (const value of [null, [], { mcpServers: [] }, { mcpServers: null }, { mcpServers: 'bad' }]) {
    const root = fixture(t);
    const target = agentConfigPath(root, 'cursor');
    write(target, JSON.stringify(value));
    const before = fs.readFileSync(target);
    assert.throws(() => install({ root, agents: ['cursor'], settings }), /JSON object/);
    assert.deepEqual(fs.readFileSync(target), before);
  }
});

test('credential symlinks are refused and their targets stay untouched', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t);
  const victim = path.join(root, 'unrelated.json');
  write(victim, { untouched: true });
  const target = agentConfigPath(root, 'cursor');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(victim, target);
  assert.throws(() => install({ root, agents: ['cursor'], settings }), /symlink/);
  assert.deepEqual(read(victim), { untouched: true });
  assert.ok(fs.lstatSync(target).isSymbolicLink());
});

test('missing custom guide fails before writing credentials', t => {
  const root = fixture(t);
  assert.throws(() => install({ root, agents: ['cursor'], settings, guidePath: path.join(root, 'missing.md') }), /ENOENT/);
  assert.equal(fs.existsSync(agentConfigPath(root, 'cursor')), false);
});

test('a Cursor guide does not mutate Kiro configuration or install an update hook', t => {
  const root = fixture(t);
  const guide = path.join(root, 'guide.md');
  const kiro = path.join(root, '.kiro', 'agents', 'default.json');
  write(guide, '# {{PROJECT_KEY}}\nVersion {{VERSION}}');
  write(kiro, 'not JSON');
  const result = install({ root, agents: ['cursor'], settings: { ...settings, projectKey: 'EXAMPLE' }, guidePath: guide });
  assert.equal(fs.readFileSync(result.guidePath, 'utf8'), `# EXAMPLE\nVersion ${VERSION}`);
  assert.equal(fs.readFileSync(kiro, 'utf8'), 'not JSON');
  assert.equal(fs.existsSync(path.join(root, '.kiro', 'steering')), false);
  assert.equal(fs.existsSync(path.join(root, '.jira-mcp-skill', 'version-hook.cjs')), false);
});

test('malformed optional hook configuration aborts before any installation writes', t => {
  const root = fixture(t);
  const target = path.join(root, '.kiro', 'agents', 'default.json');
  write(target, { hooks: { agentSpawn: 'invalid' } });
  const before = fs.readFileSync(target);
  assert.throws(() => install({ root, agents: ['kiro'], settings, updateHook: true }), /must be an array/);
  assert.deepEqual(fs.readFileSync(target), before);
  assert.equal(fs.existsSync(path.join(root, '.jira-mcp-skill')), false);
  assert.equal(fs.existsSync(agentConfigPath(root, 'kiro')), false);
});

test('opt-in hooks preserve unrelated hooks and remain idempotent', t => {
  const root = fixture(t);
  const target = path.join(root, '.kiro', 'agents', 'default.json');
  const other = { command: 'echo unrelated-jira-mcp-skill-job' };
  write(target, { name: 'keep me', hooks: { agentSpawn: [other], onOtherEvent: [] } });
  for (let index = 0; index < 2; index++) install({ root, agents: ['kiro'], settings, updateHook: true });
  const config = read(target);
  assert.equal(config.name, 'keep me');
  assert.deepEqual(config.hooks.onOtherEvent, []);
  assert.equal(config.hooks.agentSpawn.length, 2);
  assert.deepEqual(config.hooks.agentSpawn[0], other);
  const hook = path.join(root, '.jira-mcp-skill', 'version-hook.cjs');
  const result = spawnSync(process.execPath, [hook, '--version'], { encoding: 'utf8', env: environment() });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), VERSION);
  const invoked = spawnSync(`${config.hooks.agentSpawn[1].command} --version`, {
    encoding: 'utf8', shell: true, env: environment(), timeout: 5000,
  });
  assert.equal(invoked.status, 0, invoked.stderr);
  assert.equal(invoked.stdout.trim(), VERSION);
  if (process.platform !== 'win32') assert.equal(fs.statSync(target).mode & 0o777, 0o600);
});

test('legacy steering links to the installer-owned guide keep working', { skip: process.platform === 'win32' }, t => {
  const root = fixture(t);
  const guide = path.join(root, 'source.md');
  const installed = path.join(root, '.jira-mcp-skill', 'SKILL.md');
  const steering = path.join(root, '.kiro', 'steering', 'jira-skill.md');
  write(guide, 'updated');
  write(installed, 'old');
  fs.mkdirSync(path.dirname(steering), { recursive: true });
  fs.symlinkSync(installed, steering);
  install({ root, agents: ['kiro'], settings, guidePath: guide });
  assert.equal(fs.readFileSync(steering, 'utf8'), 'updated');
  assert.ok(fs.lstatSync(steering).isSymbolicLink());
});

test('custom Jira URLs do not invent a Confluence endpoint', () => {
  const config = generateMcpConfig({ ...settings, jiraUrl: 'https://jira.example.com/jira/' });
  assert.equal(config.env.JIRA_URL, 'https://jira.example.com/jira');
  assert.equal(config.env.CONFLUENCE_URL, undefined);
  assert.equal(generateMcpConfig({ ...settings, confluenceUrl: 'https://wiki.example.com/' }).env.CONFLUENCE_URL, 'https://wiki.example.com');
  assert.throws(() => generateMcpConfig({ ...settings, jiraUrl: 'https://user:password@example.com' }), /credentials/);
  assert.throws(() => generateMcpConfig({ ...settings, jiraUrl: 'file:///tmp/test' }), /HTTP/);
});

test('CLI installs a guide through ESM with a token file and does not print credentials', t => {
  const root = fixture(t);
  const guide = path.join(root, 'guide.md');
  const token = path.join(root, 'token');
  write(guide, '# {{PROJECT_KEY}} {{VERSION}}');
  write(token, settings.token + '\n');
  const result = run(root, ['--url', settings.jiraUrl, '--email', settings.email, '--token-file', token,
    '--agent', 'kiro', '--guide', guide, '--project', 'EXAMPLE']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(root, '.kiro', 'steering', 'jira-skill.md'), 'utf8'), `# EXAMPLE ${VERSION}`);
  assert.equal((result.stdout + result.stderr).includes(settings.token), false);
});

test('headless setup requires explicit clients and complete credentials', t => {
  const root = fixture(t);
  let result = run(root, ['--url', settings.jiraUrl, '--email', settings.email], { JIRA_API_TOKEN: settings.token });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires --agent/);
  result = run(root, ['--agent', 'cursor']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Provide Jira URL/);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('all version entry points agree with package.json and need no user config', t => {
  const root = fixture(t);
  const manifest = read(path.join(packageRoot, 'package.json'));
  for (const entry of ['cli.js', 'check-update.js', 'version-hook.cjs']) {
    const result = spawnSync(process.execPath, [path.join(packageRoot, 'build', entry), '--version'], {
      encoding: 'utf8', cwd: root, env: environment(), timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), manifest.version);
  }
  assert.deepEqual(fs.readdirSync(root), []);
});

test('release comparison does not suggest downgrades or lexical misordering', () => {
  assert.equal(isNewerVersion('1.0.4', '1.0.5'), false);
  assert.equal(isNewerVersion('1.0.5', '1.0.5'), false);
  assert.equal(isNewerVersion('1.0.10', '1.0.9'), true);
  assert.equal(isNewerVersion('2.0.0', '1.9.9'), true);
  assert.equal(isNewerVersion('2.0.0-beta.1', '1.0.5'), false);
  assert.equal(isNewerVersion('invalid', '1.0.5'), false);
});

test('npm archive contains a standalone runnable CLI, hook, and license', t => {
  const root = fixture(t);
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, 'Run through npm test so the npm CLI path is available');
  const npmrc = path.join(root, 'empty.npmrc');
  write(npmrc, '');
  const output = execFileSync(process.execPath, [npmCli, '--userconfig', npmrc, '--cache', path.join(root, 'cache'),
    '--registry', 'https://registry.npmjs.org', 'pack', '--offline', '--ignore-scripts', '--json', '--pack-destination', root], {
    cwd: packageRoot, env: environment(), encoding: 'utf8', timeout: 30000,
  });
  const [packed] = JSON.parse(output);
  assert.ok(packed.files.some(file => file.path === 'LICENSE'));
  assert.ok(packed.files.some(file => file.path === 'build/version-hook.cjs'));
  const installed = path.join(root, 'installed');
  execFileSync(process.execPath, [npmCli, '--userconfig', npmrc, '--cache', path.join(root, 'cache'),
    '--registry', 'https://registry.npmjs.org', 'install', '--offline', '--no-audit', '--no-fund',
    '--prefix', installed, path.join(root, packed.filename)], {
    cwd: root, env: environment(), encoding: 'utf8', timeout: 30000,
  });
  const configRoot = path.join(root, 'client-config');
  const result = run(configRoot, ['--url', settings.jiraUrl, '--email', settings.email, '--agent', 'kiro', '--update-hook'],
    { JIRA_API_TOKEN: settings.token }, path.join(installed, 'node_modules', '@andrekurait', 'jira-mcp-skill', 'build', 'cli.js'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(agentConfigPath(configRoot, 'kiro')).mcpServers['mcp-atlassian'].env.JIRA_API_TOKEN, settings.token);
  assert.equal(fs.readFileSync(path.join(configRoot, '.jira-mcp-skill', '.version'), 'utf8').trim(), VERSION);
});
