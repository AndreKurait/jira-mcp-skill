#!/usr/bin/env node
// Version check script - runs on Kiro startup via steering
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const VERSION = '1.0.1';
const GITHUB_REPO = 'AndreKurait/jira-mcp-skill';
const SKILL_DIR = path.join(os.homedir(), '.jira-mcp-skill');
const LAST_CHECK_FILE = path.join(SKILL_DIR, '.last-check');

// Only check once per day
function shouldCheck(): boolean {
  try {
    const lastCheck = parseInt(fs.readFileSync(LAST_CHECK_FILE, 'utf8'));
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return lastCheck < oneDayAgo;
  } catch {
    return true;
  }
}

function saveCheckTime() {
  if (!fs.existsSync(SKILL_DIR)) fs.mkdirSync(SKILL_DIR, { recursive: true });
  fs.writeFileSync(LAST_CHECK_FILE, Date.now().toString());
}

async function checkForUpdates() {
  if (!shouldCheck()) return;
  
  return new Promise<void>((resolve) => {
    const req = https.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'jira-mcp-skill' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const latest = release.tag_name?.replace(/^v/, '') || VERSION;
          if (latest !== VERSION) {
            console.log(`\n⚠️  jira-mcp-skill update available: v${VERSION} → v${latest}`);
            console.log(`   Run: npx @andrekurait/jira-mcp-skill@latest\n`);
          }
          saveCheckTime();
        } catch {}
        resolve();
      });
    });
    req.on('error', () => resolve());
    req.setTimeout(2000, () => { req.destroy(); resolve(); });
  });
}

checkForUpdates();
