import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { VERSION } from './version.js';

export const AGENT_NAMES = ['kiro', 'claude', 'cursor'] as const;
export type AgentName = typeof AGENT_NAMES[number];
type JsonObject = Record<string, unknown>;
export interface Settings {
  jiraUrl: string;
  email: string;
  token: string;
  confluenceUrl?: string;
  projectKey?: string;
}
export interface InstallOptions {
  root: string;
  agents: AgentName[];
  settings: Settings;
  guidePath?: string;
  updateHook?: boolean;
  platform?: NodeJS.Platform;
}
interface FileChange { target: string; contents: string; previous: Buffer | null }

export function agentConfigPath(root: string, agent: AgentName, platform = process.platform): string {
  switch (agent) {
    case 'kiro': return path.join(root, '.kiro', 'settings', 'mcp.json');
    case 'cursor': return path.join(root, '.cursor', 'mcp.json');
    case 'claude': return path.join(root, ...(
      platform === 'darwin' ? ['Library', 'Application Support', 'Claude'] :
      platform === 'win32' ? ['AppData', 'Roaming', 'Claude'] : ['.config', 'Claude']
    ), 'claude_desktop_config.json');
  }
}

function object(value: unknown, description: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${description} must be a JSON object; no files were changed`);
  }
  return value as JsonObject;
}

function existingFile(target: string): Buffer | null {
  let stat: fs.Stats;
  try { stat = fs.lstatSync(target); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  if (!stat.isFile()) throw new Error(`Refusing to replace a symlink or non-regular file: ${target}`);
  return fs.readFileSync(target);
}

function jsonFile(target: string): { config: JsonObject; previous: Buffer | null } {
  const previous = existingFile(target);
  if (!previous) return { config: {}, previous };
  let parsed: unknown;
  try { parsed = JSON.parse(previous.toString('utf8')); }
  catch { throw new Error(`Invalid JSON in ${target}; fix it before installing. No files were changed`); }
  return { config: object(parsed, target), previous };
}

export function normalizeUrl(value: string, label: string): string {
  let parsed: URL;
  try { parsed = new URL(value); }
  catch { throw new Error(`${label} must be an absolute http:// or https:// URL`); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(`${label} must use HTTP(S) and must not contain credentials, a query, or a fragment`);
  }
  return parsed.toString().replace(/\/+$/, '');
}

export function generateMcpConfig(settings: Settings): JsonObject {
  const jiraUrl = normalizeUrl(settings.jiraUrl, 'Jira URL');
  if (!settings.email.trim() || !settings.token.trim()) throw new Error('Email and API token are required');
  const env: Record<string, string> = {
    JIRA_URL: jiraUrl, JIRA_USERNAME: settings.email.trim(), JIRA_API_TOKEN: settings.token.trim(),
  };
  const jira = new URL(jiraUrl);
  const confluence = settings.confluenceUrl || (
    jira.hostname.endsWith('.atlassian.net') && jira.pathname === '/' ? `${jira.origin}/wiki` : undefined
  );
  if (confluence) {
    env.CONFLUENCE_URL = normalizeUrl(confluence, 'Confluence URL');
    env.CONFLUENCE_USERNAME = settings.email.trim();
    env.CONFLUENCE_API_TOKEN = settings.token.trim();
  }
  return { command: 'uvx', args: ['mcp-atlassian'], env };
}

function shellArgument(value: string, platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    if (/["%!\r\n]/.test(value)) throw new Error('Update hooks do not support quotes, percent signs, or exclamation marks in Windows paths');
    return `"${value}"`;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function atomicWrite(change: FileChange): void {
  const current = existingFile(change.target);
  if (current === null ? change.previous !== null : change.previous === null || !current.equals(change.previous)) {
    throw new Error(`Configuration changed during setup; refusing to overwrite ${change.target}`);
  }
  const directory = path.dirname(change.target);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = path.join(directory, `.jira-mcp-skill-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, change.contents, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, change.target);
  } finally {
    try { fs.unlinkSync(temporary); }
    catch { /* Best-effort cleanup must not replace the original write/rename error. */ }
  }
}

export function install(options: InstallOptions): { agents: AgentName[]; guidePath?: string } {
  const { settings } = options;
  const root = path.resolve(options.root);
  const platform = options.platform ?? process.platform;
  const agents = [...new Set(options.agents)];
  if (!agents.length || agents.some(agent => !AGENT_NAMES.includes(agent))) throw new Error('Select at least one supported agent: kiro, claude, cursor');
  if (options.updateHook && !agents.includes('kiro')) throw new Error('--update-hook requires selecting Kiro');
  const server = generateMcpConfig(settings);
  const skillDir = path.join(root, '.jira-mcp-skill');
  const assets: FileChange[] = [];
  const configs: FileChange[] = [];
  const addAsset = (target: string, contents: string) => assets.push({ target, contents, previous: existingFile(target) });

  // Read and validate every affected file before making any changes.
  for (const agent of agents) {
    const target = agentConfigPath(root, agent, platform);
    const { config, previous } = jsonFile(target);
    const servers = config.mcpServers === undefined ? {} : object(config.mcpServers, `${target}: mcpServers`);
    config.mcpServers = { ...servers, 'mcp-atlassian': server };
    configs.push({ target, contents: `${JSON.stringify(config, null, 2)}\n`, previous });
  }

  let installedGuide: string | undefined;
  if (options.guidePath) {
    let guide = fs.readFileSync(path.resolve(options.guidePath), 'utf8');
    guide = guide.replaceAll('{{VERSION}}', VERSION).replaceAll('{{PROJECT_KEY}}', settings.projectKey || 'YOURPROJECT');
    installedGuide = path.join(skillDir, 'SKILL.md');
    addAsset(installedGuide, guide);
    if (agents.includes('kiro')) {
      const steering = path.join(root, '.kiro', 'steering', 'jira-skill.md');
      let legacyLink = false;
      try {
        if (fs.lstatSync(steering).isSymbolicLink()) {
          const destination = path.resolve(path.dirname(steering), fs.readlinkSync(steering));
          if (destination !== installedGuide) throw new Error(`Refusing to replace an unrelated steering symlink: ${steering}`);
          legacyLink = true;
        }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      // Preserve a link created by older installers; new installs use a portable copy.
      if (!legacyLink) addAsset(steering, guide);
    }
  }

  if (options.updateHook) {
    const hook = path.join(skillDir, 'version-hook.cjs');
    addAsset(hook, fs.readFileSync(new URL('./version-hook.cjs', import.meta.url), 'utf8'));
    const target = path.join(root, '.kiro', 'agents', 'default.json');
    const { config, previous } = jsonFile(target);
    const hooks = config.hooks === undefined ? {} : object(config.hooks, `${target}: hooks`);
    const spawn = hooks.agentSpawn ?? [];
    if (!Array.isArray(spawn)) throw new Error(`${target}: hooks.agentSpawn must be an array; no files were changed`);
    const command = `node ${shellArgument(hook, platform)}`;
    const retained = spawn.filter(item => {
      const entry = object(item, `${target}: agentSpawn entry`);
      return entry.command !== command && entry.command !== `node ${hook}`;
    });
    config.hooks = { ...hooks, agentSpawn: [...retained, { command }] };
    configs.push({ target, contents: `${JSON.stringify(config, null, 2)}\n`, previous });
  }
  addAsset(path.join(skillDir, '.version'), `${VERSION}\n`);
  for (const change of [...assets, ...configs]) atomicWrite(change);
  return { agents, guidePath: installedGuide };
}
