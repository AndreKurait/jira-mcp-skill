#!/usr/bin/env node
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const VERSION = '1.0.3';
const GITHUB_REPO = 'AndreKurait/jira-mcp-skill';
const SKILL_DIR = path.join(os.homedir(), '.jira-mcp-skill');
const VERSION_FILE = path.join(SKILL_DIR, '.version');

const AGENTS = {
  kiro: { name: 'Kiro', configPath: path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'), configDir: path.join(os.homedir(), '.kiro', 'settings') },
  claude: { name: 'Claude Desktop', configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'), configDir: path.join(os.homedir(), 'Library', 'Application Support', 'Claude') },
  cursor: { name: 'Cursor', configPath: path.join(os.homedir(), '.cursor', 'mcp.json'), configDir: path.join(os.homedir(), '.cursor') },
};

const colors = { reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m', red: '\x1b[31m', cyan: '\x1b[36m' };
const log = (msg: string, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

async function checkForUpdates(): Promise<{ latest: string; current: string; outdated: boolean } | null> {
  return new Promise((resolve) => {
    const req = https.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'jira-mcp-skill' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latest = release.tag_name?.replace(/^v/, '') || VERSION;
          const outdated = latest !== VERSION;
          resolve({ latest, current: VERSION, outdated });
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

function getInstalledVersion(): string | null {
  try { return fs.readFileSync(VERSION_FILE, 'utf8').trim(); } catch { return null; }
}

function saveInstalledVersion() {
  if (!fs.existsSync(SKILL_DIR)) fs.mkdirSync(SKILL_DIR, { recursive: true });
  fs.writeFileSync(VERSION_FILE, VERSION);
}

function prompt(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, (a: string) => { rl.close(); r(a.trim()); }));
}

async function promptSecret(q: string): Promise<string> {
  return new Promise(r => {
    process.stdout.write(q);
    const stdin = process.stdin;
    stdin.setRawMode?.(true); stdin.resume(); stdin.setEncoding('utf8');
    let input = '';
    const onData = (c: string) => {
      if (c === '\n' || c === '\r') { stdin.setRawMode?.(false); stdin.removeListener('data', onData); console.log(); r(input); }
      else if (c === '\u0003') process.exit();
      else if (c === '\u007F') input = input.slice(0, -1);
      else input += c;
    };
    stdin.on('data', onData);
  });
}

function generateMcpConfig(config: { jiraUrl: string; email: string; token: string }) {
  return {
    'mcp-atlassian': {
      command: 'uvx',
      args: ['mcp-atlassian'],
      env: {
        JIRA_URL: config.jiraUrl,
        JIRA_USERNAME: config.email,
        JIRA_API_TOKEN: config.token,
        CONFLUENCE_URL: config.jiraUrl.replace('.atlassian.net', '.atlassian.net/wiki'),
        CONFLUENCE_USERNAME: config.email,
        CONFLUENCE_API_TOKEN: config.token,
      },
    },
  };
}

interface AgentConfig { mcpServers?: Record<string, unknown> }

function updateAgentConfig(agentKey: keyof typeof AGENTS, mcpConfig: Record<string, unknown>) {
  const agent = AGENTS[agentKey];
  if (!fs.existsSync(agent.configDir)) fs.mkdirSync(agent.configDir, { recursive: true });
  
  let config: AgentConfig = {};
  if (fs.existsSync(agent.configPath)) {
    try { config = JSON.parse(fs.readFileSync(agent.configPath, 'utf8')); } catch {}
  }
  
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers['mcp-atlassian'] = mcpConfig['mcp-atlassian'];
  fs.writeFileSync(agent.configPath, JSON.stringify(config, null, 2));
}

function installSkillContext(projectGuide: string) {
  if (!fs.existsSync(SKILL_DIR)) fs.mkdirSync(SKILL_DIR, { recursive: true });
  const skillPath = path.join(SKILL_DIR, 'SKILL.md');
  
  // Inject current version into SKILL.md
  const guideWithVersion = projectGuide.replace('{{VERSION}}', VERSION);
  fs.writeFileSync(skillPath, guideWithVersion);
  
  // Install version check hook script
  const hookSrc = path.join(__dirname, 'version-hook.cjs');
  const hookDest = path.join(SKILL_DIR, 'version-hook.cjs');
  if (fs.existsSync(hookSrc)) {
    fs.copyFileSync(hookSrc, hookDest);
    fs.chmodSync(hookDest, '755');
  }
  
  // Add hook to Kiro agent config
  const kiroAgentDir = path.join(os.homedir(), '.kiro', 'agents');
  if (!fs.existsSync(kiroAgentDir)) fs.mkdirSync(kiroAgentDir, { recursive: true });
  const defaultAgentPath = path.join(kiroAgentDir, 'default.json');
  
  let agentConfig: any = {};
  if (fs.existsSync(defaultAgentPath)) {
    try { agentConfig = JSON.parse(fs.readFileSync(defaultAgentPath, 'utf8')); } catch {}
  }
  if (!agentConfig.hooks) agentConfig.hooks = {};
  if (!agentConfig.hooks.agentSpawn) agentConfig.hooks.agentSpawn = [];
  // Remove old hook if exists
  agentConfig.hooks.agentSpawn = agentConfig.hooks.agentSpawn.filter((h: any) => !h.command?.includes('jira-mcp-skill'));
  // Add new hook
  agentConfig.hooks.agentSpawn.push({ command: `node ${hookDest}` });
  fs.writeFileSync(defaultAgentPath, JSON.stringify(agentConfig, null, 2));
  
  const kiroSteering = path.join(os.homedir(), '.kiro', 'steering');
  if (!fs.existsSync(kiroSteering)) fs.mkdirSync(kiroSteering, { recursive: true });
  
  const kiroSkillPath = path.join(kiroSteering, 'jira-skill.md');
  if (fs.existsSync(kiroSkillPath)) fs.unlinkSync(kiroSkillPath);
  fs.symlinkSync(skillPath, kiroSkillPath);
  return skillPath;
}

async function interactiveSetup() {
  log('\n🔧 Jira MCP Skill - Interactive Setup\n', colors.cyan);
  log('This installs mcp-atlassian and configures your AI agents.\n', colors.blue);
  
  const jiraUrl = await prompt('Jira URL (e.g., https://company.atlassian.net): ');
  if (!jiraUrl) { log('URL required', colors.red); process.exit(1); }
  
  const email = await prompt('Jira Email: ');
  if (!email) { log('Email required', colors.red); process.exit(1); }
  
  const token = await promptSecret('API Token (hidden): ');
  if (!token) { log('Token required', colors.red); process.exit(1); }
  
  const projectKey = await prompt('Default Project Key (e.g., MIGRATIONS) [optional]: ');
  return { jiraUrl, email, token, projectKey };
}

async function configureAgents(mcpConfig: Record<string, unknown>) {
  const detected = (Object.keys(AGENTS) as (keyof typeof AGENTS)[]).filter(k => fs.existsSync(AGENTS[k].configDir));
  
  if (detected.length === 0) {
    log('\n⚠️  No AI agents detected. Creating Kiro config...', colors.yellow);
    updateAgentConfig('kiro', mcpConfig);
    return;
  }

  log(`\n🔍 Detected: ${detected.map(k => AGENTS[k].name).join(', ')}`, colors.blue);
  
  for (const key of detected) {
    const yn = await prompt(`Configure ${AGENTS[key].name}? (Y/n): `);
    if (yn.toLowerCase() !== 'n') {
      updateAgentConfig(key, mcpConfig);
      log(`✅ Configured ${AGENTS[key].name}`, colors.green);
    }
  }
}

function printHelp() {
  console.log(`
Jira MCP Skill Installer

Installs mcp-atlassian and project-specific context for AI agents.

Usage: npx @andrekurait/jira-mcp-skill [options]

Options:
  --url       Jira URL
  --email     Jira email  
  --token     API token
  --project   Default project key
  --guide     Path to project guide markdown file

Examples:
  npx @andrekurait/jira-mcp-skill
  npx @andrekurait/jira-mcp-skill --url https://x.atlassian.net --email me@x.com --token xxx
  npx @andrekurait/jira-mcp-skill --guide ./my-project-guide.md
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { printHelp(); return; }
  if (args.includes('--version') || args.includes('-v')) { console.log(VERSION); return; }

  // Check for updates on startup
  log(`\n📦 Jira MCP Skill v${VERSION}`, colors.cyan);
  const update = await checkForUpdates();
  if (update?.outdated) {
    log(`\n⚠️  Update available: v${update.current} → v${update.latest}`, colors.yellow);
    log(`   Run: npx @andrekurait/jira-mcp-skill@latest`, colors.yellow);
    const yn = await prompt('Continue with current version? (Y/n): ');
    if (yn.toLowerCase() === 'n') {
      log('Run: npx @andrekurait/jira-mcp-skill@latest', colors.blue);
      return;
    }
  }

  const urlIdx = args.indexOf('--url');
  const emailIdx = args.indexOf('--email');
  const tokenIdx = args.indexOf('--token');
  const guideIdx = args.indexOf('--guide');
  
  let config;
  if (urlIdx !== -1 && emailIdx !== -1 && tokenIdx !== -1) {
    config = {
      jiraUrl: args[urlIdx + 1],
      email: args[emailIdx + 1],
      token: args[tokenIdx + 1],
      projectKey: args.indexOf('--project') !== -1 ? args[args.indexOf('--project') + 1] : '',
    };
    log('\n🚀 Automatic Setup Mode\n', colors.cyan);
  } else {
    config = await interactiveSetup();
  }

  const mcpConfig = generateMcpConfig(config);
  await configureAgents(mcpConfig);
  
  const guidePath = guideIdx !== -1 ? args[guideIdx + 1] : null;
  if (guidePath && fs.existsSync(guidePath)) {
    const guide = fs.readFileSync(guidePath, 'utf8');
    const skillPath = installSkillContext(guide);
    log(`\n📚 Installed project guide to ${skillPath}`, colors.green);
  } else {
    log('\n💡 Tip: Use --guide <path> to install a project-specific guide', colors.yellow);
  }

  // Save installed version
  saveInstalledVersion();

  log(`
${colors.green}✅ Setup complete!${colors.reset}

${colors.cyan}What was installed:${colors.reset}
  • mcp-atlassian MCP server configured for your agents
  • Uses: ${colors.blue}https://github.com/sooperset/mcp-atlassian${colors.reset}

${colors.cyan}Next steps:${colors.reset}
  1. Restart your AI agent (Kiro, Claude, Cursor)
  2. Ask: "Search for my open issues in ${config.projectKey || 'PROJECT'}"

${colors.blue}Available tools (from mcp-atlassian):${colors.reset}
  • jira_search, jira_get_issue, jira_create_issue
  • jira_update_issue, jira_transition_issue
  • confluence_search, confluence_get_page, confluence_create_page
`);
}

main().catch(e => { log(`Error: ${e.message}`, colors.red); process.exit(1); });
