# Jira MCP Skill

> **One-command installer for [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) with project-specific context**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This skill package:
1. **Installs** the [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) MCP server
2. **Configures** your AI agents (Kiro, Claude Desktop, Cursor)
3. **Provides** project-specific context via SKILL.md

## Quick Install

```bash
npx @andrekurait/jira-mcp-skill
```

Interactive prompts for:
- Jira URL
- Email
- API Token
- Default project key

## Automatic Install

```bash
npx @andrekurait/jira-mcp-skill \
  --url https://yourcompany.atlassian.net \
  --email your@email.com \
  --token your-api-token \
  --project MIGRATIONS \
  --guide ./skill/SKILL.md
```

## With Project Guide

Include your project-specific context:

```bash
npx @andrekurait/jira-mcp-skill --guide ./my-project-guide.md
```

The guide is installed to `~/.jira-mcp-skill/SKILL.md` and symlinked to Kiro's steering directory.

## What Gets Installed

### MCP Server: mcp-atlassian

The installer configures [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) which provides:

| Jira Tools | Confluence Tools |
|------------|------------------|
| `jira_search` - JQL search | `confluence_search` - CQL search |
| `jira_get_issue` - Get details | `confluence_get_page` - Get page |
| `jira_create_issue` - Create | `confluence_create_page` - Create |
| `jira_update_issue` - Update | `confluence_update_page` - Update |
| `jira_transition_issue` - Status | `confluence_add_comment` - Comment |

### Project Context: SKILL.md

The included `skill/SKILL.md` contains MIGRATIONS project specifics:
- Project key, board IDs, sprint info
- Custom fields (Story Points: `customfield_10032`)
- Components, workflow statuses, versions
- Team members, JQL examples
- Ticket writing best practices

## Agent Configuration

The installer updates these config files:

| Agent | Config Path |
|-------|-------------|
| Kiro | `~/.kiro/settings/mcp.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |

## Getting an API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create token
3. Copy (shown only once)

## Project Structure

```
jira-mcp-skill/
├── packages/jira-mcp-skill/   # npm installer
│   └── src/cli.ts
├── skill/
│   └── SKILL.md               # MIGRATIONS project guide
└── README.md
```

## Customizing for Your Project

1. Fork this repo
2. Edit `skill/SKILL.md` with your project details
3. Run installer with `--guide skill/SKILL.md`

## Dependencies

- [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) - The actual MCP server
- [uv](https://github.com/astral-sh/uv) - Python package manager (for `uvx`)

## License

MIT

## Credits

- [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian) - MCP server for Atlassian
- [Orchestra-Research/AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) - Skill pattern inspiration
