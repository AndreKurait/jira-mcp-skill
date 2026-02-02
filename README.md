# Jira MCP Skill

> **One-command installer for Jira integration with AI coding agents**

[![npm version](https://badge.fury.io/js/@akurait%2Fjira-mcp-skill.svg)](https://www.npmjs.com/package/@akurait/jira-mcp-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Install Jira tools to **any AI coding agent** (Kiro, Claude Desktop, Cursor) with one command. Credentials are stored securely in your system keychain.

## Quick Install

```bash
npx @akurait/jira-mcp-skill
```

This launches an interactive installer that:
- **Prompts** for your Jira URL, email, and API token
- **Stores** credentials securely in system keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Auto-detects** installed AI agents
- **Configures** each agent automatically

## Features

- 🔐 **Secure credential storage** - Uses system keychain, not environment variables
- 🤖 **Multi-agent support** - Kiro, Claude Desktop, Cursor
- ⚡ **One-command install** - No manual config file editing
- 🔄 **Interactive & automatic modes** - CI/CD friendly
- 🛠️ **Full Jira API** - Create, search, update, transition issues

## Installation Methods

### Interactive Mode (Recommended)

```bash
npx @akurait/jira-mcp-skill
```

You'll be prompted for:
1. Jira URL (e.g., `https://yourcompany.atlassian.net`)
2. Email address
3. API token (hidden input)

### Automatic Mode (CI/CD)

```bash
npx @akurait/jira-mcp-skill \
  --url https://yourcompany.atlassian.net \
  --email your-email@company.com \
  --token your-api-token \
  --agents kiro,claude,cursor
```

### Check Status

```bash
npx @akurait/jira-mcp-skill status
```

### Uninstall

```bash
npx @akurait/jira-mcp-skill uninstall
```

## Getting a Jira API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name (e.g., "MCP Skill")
4. Copy the token (you won't see it again)

## Supported AI Agents

| Agent | Config Location | Status |
|-------|----------------|--------|
| **Kiro** | `~/.kiro/settings/mcp.json` | ✅ Supported |
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` | ✅ Supported |
| **Cursor** | `~/.cursor/mcp.json` | ✅ Supported |

## Available Tools

Once installed, these tools are available in your AI agent:

| Tool | Description |
|------|-------------|
| `create_issue` | Create new Jira issues (Story, Task, Bug, Epic) |
| `search_issues` | Search using JQL (Jira Query Language) |
| `get_issue` | Get detailed issue information |
| `update_issue` | Update issue fields |
| `add_comment` | Add comments to issues |
| `transition_issue` | Move issues through workflow (To Do → In Progress → Done) |
| `link_issues` | Create links between issues |
| `get_projects` | List accessible projects |

## Usage Examples

After installation, ask your AI agent:

```
"Create a bug in PROJECT for the login page not loading"

"Search for all open issues assigned to me"

"Move PROJ-123 to In Progress"

"Add a comment to PROJ-456 saying the fix is deployed"

"Link PROJ-789 as blocking PROJ-790"
```

## Security

Credentials are stored using the [keytar](https://github.com/atom/node-keytar) library:

- **macOS**: Keychain Access
- **Windows**: Credential Manager  
- **Linux**: Secret Service API (libsecret)

No credentials are stored in:
- Environment variables
- Plain text files
- Agent config files

## Project Structure

```
jira-mcp-skill/
├── packages/
│   └── jira-mcp-skill/     # npm installer CLI
│       ├── src/cli.ts      # Interactive/automatic installer
│       └── package.json
├── skill/                   # MCP server
│   ├── src/index.ts        # Jira API implementation
│   └── package.json
└── README.md
```

## Manual Configuration

If you prefer manual setup, add this to your agent's MCP config:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-skill/skill/build/index.js"]
    }
  }
}
```

Then store credentials:
```bash
# macOS
security add-generic-password -s "jira-mcp-skill" -a "url" -w "https://x.atlassian.net"
security add-generic-password -s "jira-mcp-skill" -a "email" -w "you@x.com"
security add-generic-password -s "jira-mcp-skill" -a "token" -w "your-token"
```

## Troubleshooting

### "Credentials not configured"
Run `npx @akurait/jira-mcp-skill` to set up credentials.

### "Tool not found" in agent
Restart your AI agent after installation.

### Authentication errors
1. Verify your API token at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Check the email matches your Atlassian account
3. Ensure URL has no trailing slash

### Story Points not appearing
The server uses `customfield_10032` for Story Points. Your Jira instance may use a different field ID.

## Development

```bash
# Clone the repo
git clone https://github.com/akurait/jira-mcp-skill
cd jira-mcp-skill

# Install dependencies
cd skill && npm install && npm run build
cd ../packages/jira-mcp-skill && npm install && npm run build

# Test locally
node packages/jira-mcp-skill/build/cli.js
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - The MCP standard
- [Orchestra Research AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs) - Inspiration for the installer pattern
- [keytar](https://github.com/atom/node-keytar) - Secure credential storage

---

**Made with ❤️ for the AI coding community**
