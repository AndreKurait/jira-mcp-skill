#!/usr/bin/env node
// Version check hook for Kiro - runs on agent spawn
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSION = '1.0.4';
const GITHUB_REPO = 'AndreKurait/jira-mcp-skill';
const SKILL_DIR = path.join(os.homedir(), '.jira-mcp-skill');
const LAST_CHECK_FILE = path.join(SKILL_DIR, '.last-check');

function shouldCheck() {
  try {
    const lastCheck = parseInt(fs.readFileSync(LAST_CHECK_FILE, 'utf8'));
    return Date.now() - lastCheck > 24 * 60 * 60 * 1000; // Once per day
  } catch { return true; }
}

function saveCheckTime() {
  fs.mkdirSync(SKILL_DIR, { recursive: true });
  fs.writeFileSync(LAST_CHECK_FILE, Date.now().toString());
}

function checkForUpdates() {
  if (!shouldCheck()) { process.exit(0); }
  
  const req = https.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { 'User-Agent': 'jira-mcp-skill' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latest = release.tag_name?.replace(/^v/, '') || VERSION;
        saveCheckTime();
        if (latest !== VERSION) {
          console.log(`[jira-mcp-skill] Update available: v${VERSION} → v${latest}. Run: npx @andrekurait/jira-mcp-skill@latest`);
        }
      } catch {}
      process.exit(0);
    });
  });
  req.on('error', () => process.exit(0));
  req.setTimeout(3000, () => { req.destroy(); process.exit(0); });
}

checkForUpdates();
