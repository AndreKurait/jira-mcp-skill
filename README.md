# Jira MCP Skill

[![npm version](https://img.shields.io/npm/v/@andrekurait/jira-mcp-skill.svg)](https://www.npmjs.com/package/@andrekurait/jira-mcp-skill)
[![CI](https://github.com/AndreKurait/jira-mcp-skill/actions/workflows/ci.yml/badge.svg)](https://github.com/AndreKurait/jira-mcp-skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Configure selected Kiro CLI, Claude Desktop, and Cursor clients to launch [mcp-atlassian](https://github.com/sooperset/mcp-atlassian), with an optional project guide. This package writes client configuration; the client runs the MCP server through `uvx` when it starts.

The instructions below describe **2.0.0**. See [GitHub releases](https://github.com/AndreKurait/jira-mcp-skill/releases) for published versions and [CHANGELOG.md](https://github.com/AndreKurait/jira-mcp-skill/blob/main/CHANGELOG.md) for changes. A checkout of this repository and an older published npm package can have different behavior.

## Requirements

- Node.js 22 or later and npm.
- An existing `uvx` installation available to your client. Follow the [uv installation guide](https://docs.astral.sh/uv/getting-started/installation/) and check `uvx --version`.
- A Jira URL, account email, and [Atlassian API token](https://id.atlassian.com/manage-profile/security/api-tokens).

The generated configuration uses email/API-token authentication for Jira and, when configured, Confluence. For OAuth, Server/Data Center personal access tokens, or separate credentials per service, follow the upstream [mcp-atlassian authentication documentation](https://github.com/sooperset/mcp-atlassian#documentation) and configure the client directly. This installer does not test your credentials or Jira permissions.

## Upgrading from 1.x

Version 2 requires Node.js 22 or later and an existing `uvx` installation. For scripts and other non-interactive setup, add at least one explicit `--agent` and supply complete credentials. Automatic client detection and tenant/project defaults have been removed. Continue to use `--guide` for a custom guide; add `--update-hook` separately for Kiro startup notifications. Setup no longer checks GitHub for releases automatically.

Keep a private backup of the client files you intend to update, then run the new installer for those clients. Once 2.0.0 is published, verify the downloaded package with:

```sh
npx @andrekurait/jira-mcp-skill@2.0.0 --version
```

Updating a global npm installation or downloading the new CLI does not change existing client JSON, guides, or installed hooks. Rerun setup to apply the new behavior. Include `--update-hook` when refreshing an existing Kiro notification script; omitting it preserves the old hook. The installer cannot recover settings already lost to an older installation.

## Quick start

```sh
npx @andrekurait/jira-mcp-skill
```

In a terminal, the installer asks for missing credentials and which clients to configure. The token prompt hides your input. You can select clients explicitly:

```sh
npx @andrekurait/jira-mcp-skill --agent cursor --agent kiro
```

Restart those clients after setup. They must be able to find `uvx` on their own `PATH`; a GUI application's environment can differ from your terminal. The generated server command is `uvx mcp-atlassian`, without a pinned server version. Set a version in your client configuration if you need to control upstream server upgrades.

### Non-interactive setup

Supply the token through a secret-managed `JIRA_API_TOKEN` environment variable or an existing private file containing only the token. Always select at least one client:

```sh
npx @andrekurait/jira-mcp-skill \
  --url https://example.atlassian.net \
  --email you@example.com \
  --token-file /path/to/private/jira-token \
  --agent cursor
```

`JIRA_URL` and `JIRA_USERNAME` can also supply the URL and email. Missing credentials or clients cause a non-interactive run to exit without writing files. The legacy `--token` option remains available, but exposes the token in process arguments and can leave it in shell history.

## Configuration and credentials

Only selected clients are changed. Existing settings and other MCP servers are preserved; the `mcp-atlassian` entry is replaced with the new configuration. Malformed JSON, invalid object shapes, or a missing guide stop validation before any files are written. Each file is replaced atomically, but the installation is not a transaction across files: a later filesystem failure can leave earlier files updated.

**Tokens are plaintext in client JSON.** On Unix, files written by the installer have mode `0600`, and newly created directories have mode `0700`. Windows access is governed by your directory ACLs; this installer does not configure ACLs or encrypt credentials. Keep config files and token files out of source control, logs, and shared backups. Existing config-file symlinks are refused rather than followed or replaced.

Paths are relative to your home directory by default:

| Client | Configuration path |
| --- | --- |
| Kiro CLI | `.kiro/settings/mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Claude Desktop, macOS | `Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop, Windows | `AppData/Roaming/Claude/claude_desktop_config.json` |
| Claude-compatible Linux installations | `.config/Claude/claude_desktop_config.json` |

The Linux path is a conventional fallback, not a claim of official Claude Desktop Linux support. Redirect every installer-managed path with `--config-root /path/to/root` for isolated testing or a nonstandard home layout. A version marker is written to `.jira-mcp-skill/.version` under that root.

For a root Atlassian Cloud URL such as `https://example.atlassian.net`, Confluence defaults to the same tenant's `/wiki` endpoint. Other Jira URLs do not imply a Confluence service. Use `--confluence-url` to supply one explicitly; the generated configuration uses the same email and token for both services.

## Optional project guide

Start from [skill/SKILL.md](https://github.com/AndreKurait/jira-mcp-skill/blob/main/skill/SKILL.md) in this repository and customize it with your project's public or locally stored context. The template contains no tenant, board, sprint, user, or custom-field IDs.

```sh
npx @andrekurait/jira-mcp-skill \
  --agent kiro \
  --guide ./my-project-guide.md \
  --project EXAMPLE
```

The installer substitutes `{{PROJECT_KEY}}` and `{{VERSION}}`, then copies the guide to `.jira-mcp-skill/SKILL.md`. When Kiro is selected, it also writes `.kiro/steering/jira-skill.md`. A symlink created by an older installer is preserved only if it points to this installer's own guide. For Cursor or Claude, attach the copied guide using that client's context features; the installer does not register it automatically.

`--project` affects guide text only. It does not restrict server permissions or filter Jira access. A guide becomes instructions for your agent, so review its contents before installing it. The installer reads and copies guide text; it does not execute it.

## Optional update notifications

Setup, `--help`, and `--version` make no update-check requests. `npx` itself may contact npm to download the package.

Use `--check-updates` for a standalone GitHub release check. To install a Kiro startup notification, select Kiro and add `--update-hook` during setup. That hook checks the public repository's latest release, skips repeat checks for 24 hours after a successful response, and times out after three seconds. It sends no Jira credentials or project context and never downloads an update.

Set `JIRA_MCP_SKILL_DISABLE_UPDATE_CHECK=1` in Kiro's environment to disable the hook. Omitting `--update-hook` on a later setup preserves any existing hook. To remove it, delete only the `agentSpawn` command pointing to `.jira-mcp-skill/version-hook.cjs` from `.kiro/agents/default.json`.

## CLI options

| Option | Purpose |
| --- | --- |
| `--url <url>` | Jira URL; fallback `JIRA_URL` |
| `--email <email>` | Account email; fallback `JIRA_USERNAME` |
| `--token-file <path>` | Read token from a file; otherwise use `JIRA_API_TOKEN` or the prompt |
| `--token <value>` | Legacy token argument; emits an exposure warning |
| `--agent <name>` | `kiro`, `claude`, or `cursor`; repeat to select several |
| `--confluence-url <url>` | Explicit Confluence URL |
| `--guide <path>` | Copy a custom project guide |
| `--project <key>` | Replace `{{PROJECT_KEY}}` in a guide; default `YOURPROJECT` |
| `--config-root <path>` | Root for all managed paths; default home directory |
| `--update-hook` | Install the optional Kiro release notification |
| `--check-updates` | Check GitHub releases and exit |
| `--version`, `-v` | Print the package version and exit |
| `--help`, `-h` | Print help and exit |

## Troubleshooting and removal

- **Server does not start:** verify `uvx` is installed and available to the client, then restart the client and inspect its MCP logs. This installer does not install Python or run the server.
- **Authentication fails:** confirm your account, token, URL, and permissions using the upstream documentation. Do not paste tokens or full client configs into issues.
- **Invalid JSON:** repair the named file and rerun. The installer does not discard unreadable configuration.
- **Remove integration:** remove only `mcpServers["mcp-atlassian"]` from each configured client, remove any installed Kiro hook and steering entry, then remove `.jira-mcp-skill` if you no longer need its guide. Revoke the token separately if it is no longer needed.

See [CONTRIBUTING.md](https://github.com/AndreKurait/jira-mcp-skill/blob/main/CONTRIBUTING.md) for build, test, and package checks. Bug reports should include the OS, Node and package versions, selected client, and a redacted reproduction.

## License and credits

[MIT](LICENSE). The MCP server is maintained by [sooperset/mcp-atlassian](https://github.com/sooperset/mcp-atlassian). The skill pattern was inspired by [Orchestra-Research/AI-research-SKILLs](https://github.com/Orchestra-Research/AI-research-SKILLs). This project is not an official Atlassian product.
