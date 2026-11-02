#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { AGENT_NAMES, agentConfigPath, install, type AgentName } from './installer.js';
import { VERSION } from './version.js';

const { fetchLatestVersion, isNewerVersion } = createRequire(import.meta.url)('./version-hook.cjs');

function prompt(question: string, secret = false): Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Interactive input requires a terminal; use options and JIRA_API_TOKEN or --token-file');
  return new Promise((resolve, reject) => {
    let muted = false;
    let answered = false;
    const output = new Writable({ write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    } });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    rl.on('SIGINT', () => { rl.close(); });
    rl.on('close', () => { if (!answered) reject(new Error('Setup cancelled before changes were made')); });
    rl.question(question, answer => {
      answered = true;
      muted = false;
      rl.close();
      if (secret) console.log();
      resolve(answer.trim());
    });
    muted = secret;
  });
}

function printHelp() {
  console.log(`Jira MCP Skill ${VERSION}
Configure selected clients to run mcp-atlassian through an existing uvx installation.

Usage: jira-mcp-skill [options]

  --url <url>             Jira URL (or JIRA_URL)
  --email <email>         Jira account email (or JIRA_USERNAME)
  --token-file <path>     Read the API token from a file (or use JIRA_API_TOKEN)
  --token <value>         Legacy option; exposes the token in process arguments
  --confluence-url <url>  Separate Confluence URL; inferred for Atlassian Cloud
  --project <key>         Optional key for {{PROJECT_KEY}} in a custom guide
  --agent <name>          kiro, claude, or cursor; repeat for multiple clients
  --guide <path>          Copy a custom guide; register steering only for selected Kiro
  --update-hook          Opt in to a daily GitHub release check on Kiro startup
  --check-updates        Check the public GitHub release (no automatic download)
  --config-root <path>    Root for client config paths (default: your home directory)
  --version, -v          Print the package version
  --help, -h             Print this help

Non-interactive example (provide JIRA_API_TOKEN through your environment):
  jira-mcp-skill --url https://example.atlassian.net --email you@example.com --agent cursor

Credentials are stored as plaintext in client JSON. Unix files are written with mode 0600.
`);
}

async function main() {
  const { values } = parseArgs({ options: {
    url: { type: 'string' }, email: { type: 'string' }, token: { type: 'string' },
    'token-file': { type: 'string' }, 'confluence-url': { type: 'string' },
    project: { type: 'string' }, guide: { type: 'string' },
    agent: { type: 'string', multiple: true }, 'config-root': { type: 'string' },
    'update-hook': { type: 'boolean' }, 'check-updates': { type: 'boolean' },
    version: { type: 'boolean', short: 'v' }, help: { type: 'boolean', short: 'h' },
  }, strict: true });
  if (values.help) { printHelp(); return; }
  if (values.version) { console.log(VERSION); return; }

  if (values['check-updates']) {
    const latest: string | null = await fetchLatestVersion();
    console.log(latest === null ? 'Could not check GitHub releases; no changes made.' :
      isNewerVersion(latest, VERSION) ? `Update available: ${VERSION} → ${latest}` : `No newer stable release found (installed ${VERSION}).`);
    return;
  }

  const root = path.resolve(values['config-root'] || os.homedir());
  let jiraUrl = values.url || process.env.JIRA_URL;
  let email = values.email || process.env.JIRA_USERNAME;
  if (values.token && values['token-file']) throw new Error('Use one token source: --token-file or --token');
  let token = values['token-file'] ? fs.readFileSync(path.resolve(values['token-file']), 'utf8').trim() :
    values.token || process.env.JIRA_API_TOKEN;
  if (values.token) console.warn('Warning: token values in process arguments are visible; use JIRA_API_TOKEN or a token file.');
  if (!jiraUrl || !email || !token) {
    if (!process.stdin.isTTY) throw new Error('Provide Jira URL, email, and a token via options/environment; no files were changed');
    console.log('Configure Jira MCP. Tokens will be stored as plaintext in the selected client configurations.');
    jiraUrl ||= await prompt('Jira URL (for example, https://example.atlassian.net): ');
    email ||= await prompt('Jira email: ');
    token ||= await prompt('API token (hidden): ', true);
  }

  let selected = values.agent ?? [];
  if (!selected.length) {
    if (!process.stdin.isTTY) throw new Error('Non-interactive setup requires --agent kiro, --agent claude, or --agent cursor');
    const detected = AGENT_NAMES.filter(agent => fs.existsSync(path.dirname(agentConfigPath(root, agent))));
    const selection = await prompt(`Clients to configure, comma-separated (kiro, claude, cursor)${detected.length ? ` [${detected.join(',')}]` : ''}: `);
    selected = selection ? selection.split(',').map(name => name.trim()) : detected;
  }
  if (!selected.length || selected.some(name => !AGENT_NAMES.includes(name as AgentName))) throw new Error('Select supported clients: kiro, claude, cursor');

  const result = install({
    root, agents: selected as AgentName[],
    settings: { jiraUrl, email, token, confluenceUrl: values['confluence-url'], projectKey: values.project },
    guidePath: values.guide, updateHook: values['update-hook'],
  });
  console.log(`Configured: ${result.agents.join(', ')}.`);
  if (result.guidePath) console.log(`Project guide: ${result.guidePath}`);
  console.log('Restart the selected client(s). They will launch uvx mcp-atlassian; this installer does not download or run the server.');
}

main().catch(error => { console.error(`Error: ${(error as Error).message}`); process.exitCode = 1; });
