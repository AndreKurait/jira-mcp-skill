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

## Discovery Commands

Use these to query your Jira instance and discover project metadata:

### Users (Team Members)
```python
# Find all users who have been assigned issues
jira_search("project = MIGRATIONS AND assignee IS NOT EMPTY", fields=["assignee"])

# Get specific user profile
jira_get_user("akurait@amazon.com")
```

### Versions (Fix Versions / Releases)
```python
# List all versions for the project
jira_get_project("MIGRATIONS")  # includes versions in response

# Find issues by version
jira_search("project = MIGRATIONS AND fixVersion = 'MAv3.0'")

# Find unscheduled issues
jira_search("project = MIGRATIONS AND fixVersion = 'not-scheduled-for-release'")
```

### Components
```python
# List all components (included in project response)
jira_get_project("MIGRATIONS")

# Find issues by component
jira_search("project = MIGRATIONS AND component = 'RFS'")

# Find issues with no component
jira_search("project = MIGRATIONS AND component IS EMPTY")
```

### Epics
```python
# List all epics
jira_search("project = MIGRATIONS AND issuetype = Epic")

# Find epic with children
jira_search("project = MIGRATIONS AND issuetype = Epic AND 'Epic Link' IS NOT EMPTY")

# Find issues under a specific epic
jira_search("parent = MIGRATIONS-1234")

# Find orphan stories (no epic)
jira_search("project = MIGRATIONS AND issuetype = Story AND parent IS EMPTY")
```

### Sprints
```python
# Get sprints from board (active, future, closed)
jira_get_board_sprints("39", state="active")
jira_get_board_sprints("39", state="future")

# Find issues in current sprint
jira_search("project = MIGRATIONS AND Sprint in openSprints()")

# Find issues not in any sprint
jira_search("project = MIGRATIONS AND Sprint IS EMPTY AND status != Done")
```

### Custom Fields Discovery
```python
# Get all fields (find custom field IDs)
jira_get_fields()

# Get issue with all fields to see what's available
jira_get_issue("MIGRATIONS-1", expand="names")
```

### Workflow & Statuses
```python
# See available transitions for an issue
jira_get_transitions("MIGRATIONS-123")

# Find issues by status
jira_search("project = MIGRATIONS AND status = 'In Progress'")

# Find blocked issues
jira_search("project = MIGRATIONS AND status = 'BLOCKED'")
```

### Labels
```python
# Find all labels in use
jira_search("project = MIGRATIONS AND labels IS NOT EMPTY", fields=["labels"])

# Find issues by label
jira_search("project = MIGRATIONS AND labels = 'Proxy'")
```

### Issue Links
```python
# Find blocking issues
jira_search("project = MIGRATIONS AND issueFunction in linkedIssuesOf('project = MIGRATIONS', 'blocks')")

# Get issue with links
jira_get_issue("MIGRATIONS-123", expand="changelog,links")
```

## License

MIT
