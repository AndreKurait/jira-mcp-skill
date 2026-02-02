#!/usr/bin/env node
import readline from 'readline';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SERVICE = 'jira-mcp-skill';
const SKILL_PKG = '@akurait/jira-mcp-server';

// Agent config paths
const AGENTS = {
  kiro: {
    name: 'Kiro',
    configPath: path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'),
    configDir: path.join(os.homedir(), '.kiro', 'settings'),
  },
  claude: {
    name: 'Claude Desktop',
    configPath: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    configDir: path.join(os.homedir(), 'Library', 'Application Support', 'Claude'),
  },
  cursor: {
    name: 'Cursor',
    configPath: path.join(os.homedir(), '.cursor', 'mcp.json'),
    configDir: path.join(os.homedir(), '.cursor'),
  },
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg: string, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let input = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r') {
        stdin.setRawMode?.(false);
        stdin.removeListener('data', onData);
        console.log();
        resolve(input);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007F') {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on('data', onData);
  });
}

async function storeCredential(key: string, value: string) {
  // Use keytar via dynamic import
  const keytar = await import('keytar');
  await keytar.setPassword(SERVICE, key, value);
}

async function getCredential(key: string): Promise<string | null> {
  const keytar = await import('keytar');
  return keytar.getPassword(SERVICE, key);
}

async function deleteCredentials() {
  const keytar = await import('keytar');
  await keytar.deletePassword(SERVICE, 'url');
  await keytar.deletePassword(SERVICE, 'email');
  await keytar.deletePassword(SERVICE, 'token');
}

function detectAgents(): string[] {
  const detected: string[] = [];
  for (const [key, agent] of Object.entries(AGENTS)) {
    if (fs.existsSync(agent.configDir)) {
      detected.push(key);
    }
  }
  return detected;
}

function getServerPath(): string {
  // Find installed server path
  try {
    const result = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const serverPath = path.join(result, SKILL_PKG, 'build', 'index.js');
    if (fs.existsSync(serverPath)) return serverPath;
  } catch {}
  
  // Local fallback
  const localPath = path.join(__dirname, '..', '..', 'skill', 'build', 'index.js');
  if (fs.existsSync(localPath)) return localPath;
  
  return 'npx @akurait/jira-mcp-server';
}

function generateMcpConfig(serverPath: string) {
  return {
    'jira': {
      command: 'node',
      args: [serverPath],
    },
  };
}

function updateAgentConfig(agentKey: string, serverPath: string) {
  const agent = AGENTS[agentKey as keyof typeof AGENTS];
  if (!agent) return false;

  // Ensure config directory exists
  if (!fs.existsSync(agent.configDir)) {
    fs.mkdirSync(agent.configDir, { recursive: true });
  }

  let config: any = {};
  if (fs.existsSync(agent.configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(agent.configPath, 'utf8'));
    } catch {}
  }

  // Add/update MCP server config
  if (!config.mcpServers) config.mcpServers = {};
  config.mcpServers.jira = generateMcpConfig(serverPath).jira;

  fs.writeFileSync(agent.configPath, JSON.stringify(config, null, 2));
  return true;
}

async function installServer() {
  log('\n📦 Installing Jira MCP server...', colors.blue);
  try {
    execSync('npm install -g @akurait/jira-mcp-server', { stdio: 'inherit' });
    return true;
  } catch {
    log('⚠️  Global install failed, using npx fallback', colors.yellow);
    return false;
  }
}

async function interactiveSetup() {
  log('\n🔧 Jira MCP Skill - Interactive Setup\n', colors.cyan);
  
  // Check existing credentials
  const existingUrl = await getCredential('url');
  if (existingUrl) {
    const overwrite = await prompt(`Existing config found for ${existingUrl}. Overwrite? (y/N): `);
    if (overwrite.toLowerCase() !== 'y') {
      log('Keeping existing configuration.', colors.yellow);
      return { url: existingUrl, email: await getCredential('email'), token: await getCredential('token') };
    }
  }

  log('Enter your Jira credentials (stored securely in system keychain):\n', colors.blue);
  
  const url = await prompt('Jira URL (e.g., https://company.atlassian.net): ');
  if (!url) { log('URL is required', colors.red); process.exit(1); }
  
  const email = await prompt('Jira Email: ');
  if (!email) { log('Email is required', colors.red); process.exit(1); }
  
  const token = await promptSecret('API Token (hidden): ');
  if (!token) { log('Token is required', colors.red); process.exit(1); }

  // Store credentials securely
  log('\n🔐 Storing credentials in system keychain...', colors.blue);
  await storeCredential('url', url);
  await storeCredential('email', email);
  await storeCredential('token', token);
  log('✅ Credentials stored securely', colors.green);

  return { url, email, token };
}

async function configureAgents() {
  const detected = detectAgents();
  const serverPath = getServerPath();

  if (detected.length === 0) {
    log('\n⚠️  No AI agents detected. Creating configs anyway...', colors.yellow);
    // Create Kiro config by default
    updateAgentConfig('kiro', serverPath);
    log(`✅ Created Kiro config at ${AGENTS.kiro.configPath}`, colors.green);
    return;
  }

  log(`\n🔍 Detected agents: ${detected.map(k => AGENTS[k as keyof typeof AGENTS].name).join(', ')}`, colors.blue);
  
  for (const agentKey of detected) {
    const agent = AGENTS[agentKey as keyof typeof AGENTS];
    const configure = await prompt(`Configure ${agent.name}? (Y/n): `);
    if (configure.toLowerCase() !== 'n') {
      updateAgentConfig(agentKey, serverPath);
      log(`✅ Configured ${agent.name}`, colors.green);
    }
  }

  // Offer to configure non-detected agents
  const notDetected = Object.keys(AGENTS).filter(k => !detected.includes(k));
  if (notDetected.length > 0) {
    const configureOthers = await prompt(`\nConfigure other agents (${notDetected.map(k => AGENTS[k as keyof typeof AGENTS].name).join(', ')})? (y/N): `);
    if (configureOthers.toLowerCase() === 'y') {
      for (const agentKey of notDetected) {
        const agent = AGENTS[agentKey as keyof typeof AGENTS];
        updateAgentConfig(agentKey, serverPath);
        log(`✅ Created config for ${agent.name}`, colors.green);
      }
    }
  }
}

async function automaticSetup(args: { url: string; email: string; token: string; agents?: string[] }) {
  log('\n🚀 Automatic Setup Mode\n', colors.cyan);
  
  await storeCredential('url', args.url);
  await storeCredential('email', args.email);
  await storeCredential('token', args.token);
  log('✅ Credentials stored', colors.green);

  const serverPath = getServerPath();
  const agentsToConfig = args.agents || Object.keys(AGENTS);
  
  for (const agentKey of agentsToConfig) {
    if (AGENTS[agentKey as keyof typeof AGENTS]) {
      updateAgentConfig(agentKey, serverPath);
      log(`✅ Configured ${AGENTS[agentKey as keyof typeof AGENTS].name}`, colors.green);
    }
  }
}

async function uninstall() {
  log('\n🗑️  Uninstalling Jira MCP Skill...\n', colors.yellow);
  
  // Remove credentials
  await deleteCredentials();
  log('✅ Credentials removed from keychain', colors.green);

  // Remove from agent configs
  for (const [key, agent] of Object.entries(AGENTS)) {
    if (fs.existsSync(agent.configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(agent.configPath, 'utf8'));
        if (config.mcpServers?.jira) {
          delete config.mcpServers.jira;
          fs.writeFileSync(agent.configPath, JSON.stringify(config, null, 2));
          log(`✅ Removed from ${agent.name}`, colors.green);
        }
      } catch {}
    }
  }

  log('\n✅ Uninstall complete', colors.green);
}

async function showStatus() {
  log('\n📊 Jira MCP Skill Status\n', colors.cyan);
  
  const url = await getCredential('url');
  const email = await getCredential('email');
  const hasToken = !!(await getCredential('token'));

  log('Credentials:', colors.blue);
  log(`  URL: ${url || '(not set)'}`, url ? colors.green : colors.red);
  log(`  Email: ${email || '(not set)'}`, email ? colors.green : colors.red);
  log(`  Token: ${hasToken ? '(set)' : '(not set)'}`, hasToken ? colors.green : colors.red);

  log('\nAgent Configurations:', colors.blue);
  for (const [key, agent] of Object.entries(AGENTS)) {
    const exists = fs.existsSync(agent.configPath);
    let hasJira = false;
    if (exists) {
      try {
        const config = JSON.parse(fs.readFileSync(agent.configPath, 'utf8'));
        hasJira = !!config.mcpServers?.jira;
      } catch {}
    }
    const status = hasJira ? '✅ Configured' : exists ? '⚠️  Config exists, Jira not added' : '❌ Not configured';
    log(`  ${agent.name}: ${status}`, hasJira ? colors.green : colors.yellow);
  }
}

function printHelp() {
  log(`
${colors.cyan}Jira MCP Skill Installer${colors.reset}

Usage: npx @akurait/jira-mcp-skill [command] [options]

Commands:
  (none)      Interactive setup
  status      Show current configuration status
  uninstall   Remove credentials and agent configs

Options (automatic mode):
  --url       Jira URL (e.g., https://company.atlassian.net)
  --email     Jira account email
  --token     Jira API token
  --agents    Comma-separated agents to configure (kiro,claude,cursor)

Examples:
  npx @akurait/jira-mcp-skill
  npx @akurait/jira-mcp-skill status
  npx @akurait/jira-mcp-skill --url https://x.atlassian.net --email me@x.com --token xxx
  npx @akurait/jira-mcp-skill uninstall
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('status')) {
    await showStatus();
    return;
  }

  if (args.includes('uninstall')) {
    await uninstall();
    return;
  }

  // Check for automatic mode args
  const urlIdx = args.indexOf('--url');
  const emailIdx = args.indexOf('--email');
  const tokenIdx = args.indexOf('--token');
  const agentsIdx = args.indexOf('--agents');

  if (urlIdx !== -1 && emailIdx !== -1 && tokenIdx !== -1) {
    const url = args[urlIdx + 1];
    const email = args[emailIdx + 1];
    const token = args[tokenIdx + 1];
    const agents = agentsIdx !== -1 ? args[agentsIdx + 1]?.split(',') : undefined;
    
    await automaticSetup({ url, email, token, agents });
  } else {
    // Interactive mode
    await interactiveSetup();
    await configureAgents();
  }

  log(`
${colors.green}✅ Setup complete!${colors.reset}

${colors.cyan}Next steps:${colors.reset}
1. Restart your AI agent (Kiro, Claude, Cursor)
2. The Jira tools will be available automatically

${colors.blue}Available tools:${colors.reset}
  • create_issue - Create Jira issues
  • search_issues - Search with JQL
  • get_issue - Get issue details
  • update_issue - Update issues
  • add_comment - Add comments
  • transition_issue - Change status
  • link_issues - Link issues
  • get_projects - List projects

${colors.yellow}Run 'npx @akurait/jira-mcp-skill status' to check configuration${colors.reset}
`);
}

main().catch((e) => {
  log(`Error: ${e.message}`, colors.red);
  process.exit(1);
});
