# Jira MCP Skill

> **One-command installer for [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) with MIGRATIONS project context**

## Quick Install

```bash
npx @andrekurait/jira-mcp-skill \
  --url https://opensearch.atlassian.net \
  --email akurait@amazon.com \
  --token YOUR_API_TOKEN \
  --project MIGRATIONS \
  --guide ./skill/SKILL.md
```

Or interactive mode:
```bash
npx @andrekurait/jira-mcp-skill
```

## What Gets Installed

1. **[mcp-atlassian](https://github.com/sooperset/mcp-atlassian)** - Jira/Confluence MCP server
2. **Agent configs** - Kiro, Claude Desktop, Cursor auto-configured
3. **SKILL.md** - MIGRATIONS project context symlinked to `~/.kiro/steering/`

## MIGRATIONS Project Quick Reference

| Field | Value |
|-------|-------|
| Project Key | `MIGRATIONS` |
| URL | https://opensearch.atlassian.net/jira/software/c/projects/MIGRATIONS |
| Board ID | `39` (for sprints) |
| Story Points | `customfield_10032` |
| Sprint Field | `customfield_10020` |
| Current Sprint | Feb 2026 (ID: `314`) |

### Common Commands

```
# Search my open issues
jira_search("project = MIGRATIONS AND assignee = currentUser() AND status != Done")

# Create a story
jira_create_issue(
  project="MIGRATIONS",
  summary="Implement feature X",
  issue_type="Story",
  fields={"fixVersions": [{"id": "10021"}]}  # not-scheduled-for-release
)

# Add to sprint
jira_update_issue("MIGRATIONS-XXX", fields={"customfield_10020": 314})

# Set story points
jira_update_issue("MIGRATIONS-XXX", fields={"customfield_10032": 5})

# Transition to In Progress
jira_transition_issue("MIGRATIONS-XXX", "In Progress")
```

### Components
- **RFS** - Reindex from Snapshot
- **CaptureProxy** - Traffic capture proxy
- **Replayer** - Event replay to target
- **Migration Console** - Workflow UI
- **Deployment** - IaC and deployment

### Workflow
```
TRIAGE → Needs Definition → Needs Refinement → To Do → In Progress → Ready for Review → Under Review → Done
```

### Versions
- MAv2.x - Current development
- MAv3.0 - Autoscaling (2025-02-21)
- MAv4.0 - Migration Console UI (2025-08-29)

## Getting an API Token

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create token → Copy it

## Agent Config Locations

| Agent | Path |
|-------|------|
| Kiro | `~/.kiro/settings/mcp.json` |
| Claude | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |

## Full SKILL.md

See [skill/SKILL.md](skill/SKILL.md) for complete project guide including:
- All 20 components with descriptions
- Custom field IDs
- Team members
- JQL examples
- Ticket writing templates

## License

MIT
