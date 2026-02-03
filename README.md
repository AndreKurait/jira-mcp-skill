# Jira MCP Skill

[![npm version](https://img.shields.io/npm/v/@andrekurait/jira-mcp-skill.svg)](https://www.npmjs.com/package/@andrekurait/jira-mcp-skill)
[![npm downloads](https://img.shields.io/npm/dm/@andrekurait/jira-mcp-skill.svg)](https://www.npmjs.com/package/@andrekurait/jira-mcp-skill)
[![GitHub release](https://img.shields.io/github/v/release/AndreKurait/jira-mcp-skill)](https://github.com/AndreKurait/jira-mcp-skill/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

One-command installer for [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) that configures Jira integration for AI coding agents (Kiro, Claude Desktop, Cursor) with project-specific context.

## Features

- 🚀 **One-command setup** - Installs and configures everything automatically
- 🤖 **Multi-agent support** - Works with Kiro, Claude Desktop, and Cursor
- 📚 **Project context** - Includes customizable SKILL.md for project-specific guidance
- 🔄 **Version checking** - Notifies you when updates are available
- 🔐 **Secure** - Credentials stored in agent config, not in code

## Quick Start

```bash
npx @andrekurait/jira-mcp-skill
```

Or install directly from GitHub:
```bash
npx github:AndreKurait/jira-mcp-skill
```

You'll be prompted for:
- Jira URL (e.g., `https://yourcompany.atlassian.net`)
- Email address
- API token ([get one here](https://id.atlassian.com/manage-profile/security/api-tokens))

## Installation Options

### Interactive Mode

```bash
npx @andrekurait/jira-mcp-skill
```

### Automatic Mode (CI/CD friendly)

```bash
npx @andrekurait/jira-mcp-skill \
  --url https://yourcompany.atlassian.net \
  --email your@email.com \
  --token YOUR_API_TOKEN \
  --project MYPROJECT \
  --guide ./path/to/project-guide.md
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--url` | Jira instance URL |
| `--email` | Jira account email |
| `--token` | Jira API token |
| `--project` | Default project key |
| `--guide` | Path to project-specific SKILL.md |
| `--version` | Show version |
| `--help` | Show help |

## What Gets Installed

1. **[mcp-atlassian](https://github.com/sooperset/mcp-atlassian)** - The MCP server providing Jira/Confluence tools
2. **Agent configuration** - Auto-configures your AI coding agents
3. **SKILL.md** - Project context guide (symlinked to `~/.kiro/steering/`)

## Available Tools

Once installed, your AI agent has access to:

| Jira | Confluence |
|------|------------|
| `jira_search` - JQL queries | `confluence_search` - CQL queries |
| `jira_get_issue` - Get issue details | `confluence_get_page` - Get page content |
| `jira_create_issue` - Create issues | `confluence_create_page` - Create pages |
| `jira_update_issue` - Update issues | `confluence_update_page` - Update pages |
| `jira_transition_issue` - Change status | `confluence_add_comment` - Add comments |

## Discovery Commands

Query your Jira instance to discover project metadata:

```python
# List all epics
jira_search("project = MYPROJECT AND issuetype = Epic")

# Find team members
jira_search("project = MYPROJECT AND assignee IS NOT EMPTY", fields=["assignee"])

# Get project info (versions, components)
jira_get_project("MYPROJECT")

# Get sprints from board
jira_get_board_sprints("BOARD_ID", state="active")

# Find custom field IDs
jira_get_fields()
```

## Agent Configuration

The installer updates these config files:

| Agent | Config Path |
|-------|-------------|
| Kiro | `~/.kiro/settings/mcp.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |

## Customizing for Your Project

1. Fork this repository
2. Edit `skill/SKILL.md` with your project details:
   - Project key, board IDs
   - Custom field mappings
   - Workflow statuses
   - Team members
   - JQL examples
3. Install with your custom guide:
   ```bash
   npx @andrekurait/jira-mcp-skill --guide ./skill/SKILL.md
   ```

## Example: MIGRATIONS Project

This repo includes a sample SKILL.md for the MIGRATIONS project:

```bash
npx @andrekurait/jira-mcp-skill \
  --url https://opensearch.atlassian.net \
  --email your@email.com \
  --token YOUR_TOKEN \
  --project MIGRATIONS \
  --guide ./skill/SKILL.md
```

See [skill/SKILL.md](skill/SKILL.md) for the full project guide including:
- Custom fields (`customfield_10032` for Story Points)
- Sprint management (Board ID 39)
- 20 components with descriptions
- Workflow states and transitions
- Ticket writing templates

## Troubleshooting

### MCP not loading
Restart your AI agent after installation.

### Authentication errors
1. Verify API token at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Check email matches your Atlassian account
3. Ensure URL has no trailing slash

### Tools not appearing
Check that `uvx` is installed: `which uvx`

If not, install [uv](https://github.com/astral-sh/uv):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Contributing

Contributions welcome! Please open an issue or PR.

## Credits

- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) - The MCP server
- [Orchestra-Research/AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) - Skill pattern inspiration

## License

MIT
