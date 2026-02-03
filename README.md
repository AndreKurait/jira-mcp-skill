# Jira MCP Skill

[![npm version](https://img.shields.io/npm/v/@andrekurait/jira-mcp-skill.svg)](https://www.npmjs.com/package/@andrekurait/jira-mcp-skill)
[![npm downloads](https://img.shields.io/npm/dm/@andrekurait/jira-mcp-skill.svg)](https://www.npmjs.com/package/@andrekurait/jira-mcp-skill)
[![GitHub release](https://img.shields.io/github/v/release/AndreKurait/jira-mcp-skill)](https://github.com/AndreKurait/jira-mcp-skill/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **One-command installer** for [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) that configures Jira/Confluence integration for AI coding agents.

**Supported Agents:** Kiro CLI • Claude Desktop • Cursor

---

## ⚡ Quick Start

```bash
npx @andrekurait/jira-mcp-skill
```

You'll be prompted for your Jira URL, email, and [API token](https://id.atlassian.com/manage-profile/security/api-tokens).

**That's it!** Restart your AI agent and start using Jira tools.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🚀 **One-command setup** | Installs and configures everything automatically |
| 🤖 **Multi-agent support** | Works with Kiro, Claude Desktop, and Cursor |
| 📚 **Project context** | Customizable SKILL.md for project-specific guidance |
| 🔄 **Auto-updates** | Kiro hook notifies you when updates are available |
| 🔐 **Secure** | Credentials stored in agent config, not in code |

---

## 📦 What Gets Installed

1. **[mcp-atlassian](https://github.com/sooperset/mcp-atlassian)** - MCP server providing Jira/Confluence tools
2. **Agent configuration** - Auto-configures detected AI agents
3. **Version check hook** - (Kiro only) Checks for updates on agent spawn

### Agent Config Paths

| Agent | Config Location |
|-------|-----------------|
| Kiro | `~/.kiro/settings/mcp.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |

---

## 🛠️ Available Tools

Once installed, your AI agent has access to these tools:

### Jira Tools
- `jira_search` - Execute JQL queries
- `jira_get_issue` - Get issue details
- `jira_create_issue` - Create new issues
- `jira_update_issue` - Update existing issues
- `jira_transition_issue` - Change issue status

### Confluence Tools
- `confluence_search` - Execute CQL queries
- `confluence_get_page` - Get page content
- `confluence_create_page` - Create new pages
- `confluence_update_page` - Update existing pages

---

## 🔧 Installation Options

### Interactive Mode (Recommended)

```bash
npx @andrekurait/jira-mcp-skill
```

### Automatic Mode (CI/CD)

```bash
npx @andrekurait/jira-mcp-skill \
  --url https://yourcompany.atlassian.net \
  --email your@email.com \
  --token YOUR_API_TOKEN \
  --project MYPROJECT
```

### With Custom Project Guide

```bash
npx @andrekurait/jira-mcp-skill --guide ./my-project-guide.md
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--url` | Jira instance URL |
| `--email` | Jira account email |
| `--token` | Jira API token |
| `--project` | Default project key |
| `--guide` | Path to project-specific SKILL.md |
| `--version`, `-v` | Show version |
| `--help`, `-h` | Show help |

---

## 📖 Customizing for Your Project

Create a `SKILL.md` file with your project-specific context:

```markdown
# My Project Jira Guide

## Project Details
- **Key:** MYPROJ
- **Board ID:** 123

## Custom Fields
- Story Points: `customfield_10032`

## Common JQL
- My open issues: `project = MYPROJ AND assignee = currentUser() AND status != Done`
```

Then install with:
```bash
npx @andrekurait/jira-mcp-skill --guide ./SKILL.md
```

The guide is installed to `~/.jira-mcp-skill/SKILL.md` and symlinked to Kiro's steering directory.

---

## 🔍 Discovery Commands

Use these to explore your Jira instance:

```python
# List all epics
jira_search("project = MYPROJ AND issuetype = Epic")

# Get project metadata
jira_get_project("MYPROJ")

# Find custom field IDs
jira_get_fields()

# Get active sprints
jira_get_board_sprints("BOARD_ID", state="active")
```

---

## 🐛 Troubleshooting

### MCP not loading
Restart your AI agent after installation.

### Authentication errors
1. Verify API token at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Check email matches your Atlassian account
3. Ensure URL has no trailing slash

### Tools not appearing
Ensure `uvx` is installed:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR on [GitHub](https://github.com/AndreKurait/jira-mcp-skill).

---

## 📄 License

MIT

---

## 🙏 Credits

- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) - The MCP server
- [Orchestra-Research/AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) - Skill pattern inspiration
