#!/usr/bin/env node
// Optional update notification. Installed beside .version; never updates software.
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function currentVersion(directory = __dirname) {
  try { return fs.readFileSync(path.join(directory, '.version'), 'utf8').trim(); }
  catch {
    return JSON.parse(fs.readFileSync(path.join(directory, '..', 'package.json'), 'utf8')).version;
  }
}

function isNewerVersion(latest, current) {
  const parse = value => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value)?.slice(1).map(Number);
  const next = parse(latest);
  const installed = parse(current);
  if (!next || !installed) return false;
  for (let index = 0; index < 3; index++) {
    if (next[index] !== installed[index]) return next[index] > installed[index];
  }
  return false;
}

function fetchLatestVersion() {
  return new Promise(resolve => {
    const req = https.get('https://api.github.com/repos/AndreKurait/jira-mcp-skill/releases/latest', {
      headers: { 'User-Agent': 'jira-mcp-skill', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(3000),
    }, res => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => {
        data += chunk;
        if (data.length > 65536) { req.destroy(); resolve(null); }
      });
      res.on('error', () => resolve(null));
      res.on('end', () => {
        try {
          const tag = JSON.parse(data).tag_name;
          resolve(typeof tag === 'string' ? tag.replace(/^v/, '') : null);
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
  });
}

async function run(args = process.argv.slice(2)) {
  const version = currentVersion();
  if (args.includes('--version')) { console.log(version); return; }
  if (process.env.JIRA_MCP_SKILL_DISABLE_UPDATE_CHECK === '1') return;
  const marker = path.join(__dirname, '.last-check');
  try {
    const previous = Number(fs.readFileSync(marker, 'utf8'));
    if (Number.isFinite(previous) && Date.now() - previous < 86400000) return;
  } catch { /* No successful check recorded yet. */ }
  const latest = await fetchLatestVersion();
  if (!latest) return;
  const temporary = path.join(__dirname, `.last-check-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, String(Date.now()), { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, marker);
  } catch { /* An optional notification must not prevent agent startup. */ }
  finally { try { fs.unlinkSync(temporary); } catch { /* Already renamed or unavailable. */ } }
  if (isNewerVersion(latest, version)) {
    console.log(`[jira-mcp-skill] Update available: ${version} → ${latest}. Run: npx @andrekurait/jira-mcp-skill@latest`);
  }
}

module.exports = { currentVersion, isNewerVersion, fetchLatestVersion, run };
if (require.main === module) run().catch(() => {});
