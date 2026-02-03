# MIGRATIONS Jira Project Guide

> **Skill Version:** 1.0.0 | Check for updates: `npx @andrekurait/jira-mcp-skill@latest --version`

## Project Overview

- **Project Key**: MIGRATIONS
- **Project Name**: Migration and Upgrades
- **URL**: https://opensearch.atlassian.net/jira/software/c/projects/MIGRATIONS
- **Board IDs**: 3 (Migrations - All Releases), 39 (Migrations - for estimation API)
- **Lead**: Brian Presley
- **Style**: Classic Jira Software

## Story Points

Set story points using `jira_update_issue` with `customfield_10032`:
```
{"customfield_10032": 5}
```

**Field:** `customfield_10032` - Story Points

## Sprints

We use **monthly sprints** named by month and year (e.g., "Feb 2026", "Mar 2026").

- Sprint field: `customfield_10020`
- Sprints are managed on Board ID 39

### Current Sprints
| Sprint | ID | URL |
|--------|-----|-----|
| Feb 2026 | 314 | https://opensearch.atlassian.net/secure/GHGoToBoard.jspa?sprintId=314 |

### Discovering Sprints
```
jira_get_sprints_from_board(board_id="39", state="future")  # or "active", "closed"
```

### Adding Issues to Sprint
```python
jira_update_issue(issue_key="MIGRATIONS-XXX", fields={"customfield_10020": 314})
```

## Issue Types

| Type | Description | Hierarchy | When to Use |
|------|-------------|-----------|-------------|
| **Epic** | Large feature or initiative that needs breakdown | Parent (Level 1) | Group of related stories |
| **Story** | User-facing functionality or deliverable | Standard (Level 0) | **Default for new work** |
| **Bug** | Problem or error to fix | Standard (Level 0) | Defects only |
| **Task** | Small, distinct piece of technical work | Standard (Level 0) | Rarely - prefer Story |

**Default:** Always create new issues as **Story** unless it's a defect (Bug).
| **Sub-task** | Part of a larger Story/Task | Child (Level -1) |

## Components (20 total)

### Core Migration Components
| Component | Description |
|-----------|-------------|
| **CaptureProxy** | Proxy that captures ES/OS traffic, sends to source cluster and replayer |
| **Replayer** | Reads from event streamer and sends events to target cluster |
| **RFS** | Reindex from Snapshot - historical data migration |
| **EventStreamer** | Durable storage between Proxy and Replayer |
| **Meta Data Migration** | Migration of index settings, components, aliases, templates |

### Infrastructure & Tooling
| Component | Description |
|-----------|-------------|
| **Migration Console** | Facilitates migration workflow |
| **Deployment** | IaC and deployment code |
| **IaC Templates and Container Tools** | Provision local and cloud environments |
| **Workflow Orchestration** | Migration workflow orchestration with Kubernetes |
| **Tests and Infrastructure** | CI/CD, stress, and longevity testing |
| **Developer Tooling** | Build and development tooling |

### Specialized Components
| Component | Description |
|-----------|-------------|
| **Assessment** | Identifying breaking changes before migration |
| **Validation** | Compares results of traffic sent to source and target |
| **Fetch** | Tooling for historical migrations |
| **Transformations** | Data transformation support |
| **Ingestion Service** | Support for OpenSearch Ingestion |
| **Documentation** | Standalone documentation updates |
| **AWS Solutions** | AWS-specific solutions |
| **CompleteSolution** | Encapsulates the complete solution |
| **GenAI** | GenAI-related features |

## Workflow Statuses

```
TRIAGE → Needs Definition → Needs Refinement → To Do → In Progress → Ready for Review → Under Review → Done
                                                  ↓
                                              BLOCKED
                                                  ↓
                                              DROPPED
                                                  ↓
                                             PUBLISHED
```

| Status | Category | Description |
|--------|----------|-------------|
| **TRIAGE** | To Do | New issues awaiting initial review |
| **Needs Definition** | To Do | Requires more detail/scope |
| **Needs Refinement** | To Do | Needs technical breakdown |
| **To Do** | To Do | Ready to be worked on |
| **In Progress** | In Progress | Actively being worked |
| **BLOCKED** | In Progress | Waiting on external dependency |
| **Ready for Review** | In Progress | Code complete, awaiting review |
| **Under Review** | In Progress | Being reviewed |
| **Done** | Done | Completed |
| **DROPPED** | Done | Cancelled/not doing |
| **PUBLISHED** | Done | Released/published |

## Active Versions

### Current Development
| Version | Description | Target Date |
|---------|-------------|-------------|
| **MAv2.2** | - | 2025-02-13 |
| **MAv2.3** | - | TBD |
| **MAv2.4** | - | TBD |
| **MAv2.5** | - | TBD |
| **MAv2.6** | - | TBD |
| **MAv3.0** | Autoscaling | 2025-02-21 |
| **MAv3.1** | - | 2025-04-30 |
| **MAv4.0** | Migration Console UI | 2025-08-29 |
| **MAv5.0** | - | TBD |

### Special Versions
- **for-review**: Issues pending review
- **not-scheduled-for-release**: Backlog items

## Labels

| Label | Usage |
|-------|-------|
| **Proxy** | CaptureProxy-related work |
| **Replayer** | Replayer-related work |
| **Orchestration** | Workflow orchestration work |
| **Validation** | Validation-related work |
| **Testing** | Test infrastructure work |
| **oncall-activity** | On-call related issues |

## Priority Levels

| Priority | When to Use |
|----------|-------------|
| **Highest** | Critical blockers, production issues |
| **High** | Important for current release |
| **Medium** | Standard priority (default) |
| **Low** | Nice to have |
| **Lowest** | Future consideration |

## Custom Fields

| Field | ID | Usage |
|-------|-----|-------|
| **Story Points** | customfield_10032 | Effort estimation |
| **Sprint** | customfield_10020 | Sprint assignment |
| **Epic Link** | customfield_10014 | Link to parent Epic |
| **Start date** | customfield_10015 | Planned start |
| **Target end** | customfield_10023 | Target completion |
| **GitHub Issue URL** | customfield_10035 | Link to GitHub |
| **Flagged** | customfield_10021 | Impediment flag |

## Issue Link Types

| Link Type | Inward | Outward |
|-----------|--------|---------|
| **Blocks** | is blocked by | blocks |
| **Relates** | relates to | relates to |
| **Duplicate** | is duplicated by | duplicates |
| **Cloners** | is cloned by | clones |

## Team Members

| Name | Email | Role |
|------|-------|------|
| Andre Kurait | akurait@amazon.com | Engineer |
| Greg Schohn | - | Engineer |
| Jugal Chauhan | - | Engineer |
| Mikayla Thompson | - | Engineer |
| Brian Presley | - | Lead |

### User Discovery
Find users via JQL:
```sql
project = MIGRATIONS AND assignee IS NOT EMPTY
```

Or use `jira_get_user_profile` with display name or email:
```
jira_get_user_profile(user_identifier="Brian Presley")
```

### Setting Assignee and Reporter
Use display name (e.g., "Andre Kurait") or email for both assignee and reporter fields:
```python
# Set assignee
jira_update_issue(issue_key="MIGRATIONS-XXX", fields={"assignee": "Andre Kurait"})

# Change reporter (requires project admin or "Modify Reporter" permission)
jira_update_issue(issue_key="MIGRATIONS-XXX", fields={"reporter": "Brian Presley"})
```

The MCP resolves display names to accountIds automatically.

## Required Fields for Issue Creation

When creating issues, `fixVersions` is required. Use:
- `{"fixVersions": [{"id": "10021"}]}` for "not-scheduled-for-release" (backlog)
- Or specify a release version like MAv3.0, MAv3.1, etc.

To link a task to an epic, use `parent` field:
```
{"parent": "MIGRATIONS-1234"}
```

## Useful JQL for Discovery

```sql
-- Find team members (unique assignees)
project = MIGRATIONS AND assignee IS NOT EMPTY

-- Find all epics
project = MIGRATIONS AND issuetype = Epic

-- Find tasks under an epic
parent = MIGRATIONS-1234

-- Find unestimated tasks
project = MIGRATIONS AND "Story Points" IS EMPTY AND issuetype = Task
```

---

# Ticket Writing Best Practices

## Summary Guidelines

✅ **Good Summaries:**
- "Implement Migration Confidence Scoring System"
- "aws-bootstrap --build-images cannot build cross-platform"
- "Add Jenkins test for Serverless Target"

❌ **Bad Summaries:**
- "Fix bug" (too vague)
- "Update code" (no context)
- "URGENT: Need this done" (no description)

### Summary Format by Type

| Type | Format | Example |
|------|--------|---------|
| **Epic** | `[Area] High-level capability` | "Replayer Gradual Migration Support" |
| **Story** | `[Action] [Feature] for [benefit]` | "Implement Migration Confidence Scoring System" |
| **Task** | `[Action] [specific item]` | "Add Jenkins test for Serverless Target" |
| **Bug** | `[Component] [symptom/error]` | "aws-bootstrap --build-images cannot build cross-platform" |

## Description Templates

### Story Template
```markdown
[Brief description of the user need or feature]

## Background
[Context and motivation]

## Requirements
1. [Requirement 1]
2. [Requirement 2]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation updated
```

### Task Template
```markdown
[What needs to be done and why]

## Details
[Technical details, approach, or constraints]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
```

### Bug Template
```markdown
## Problem
[Clear description of the bug]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Version: [version]
- Platform: [platform]

## Workaround
[If any]
```

### Epic Template
```markdown
## Overview
[High-level description of the initiative]

## Goals
- [Goal 1]
- [Goal 2]

## Scope
### In Scope
- [Item 1]
- [Item 2]

### Out of Scope
- [Item 1]

## Success Criteria
- [Metric 1]
- [Metric 2]

## Child Issues
- [ ] [Story/Task 1]
- [ ] [Story/Task 2]
```

## Example: Well-Written Story

**Summary**: Implement Migration Confidence Scoring System

**Description**:
```markdown
Create an aggregate confidence scoring system that combines technical parity, 
relevance similarity, and business metrics into a single "migration readiness" 
score to guide go/no-go decisions.

## Confidence Score Components
1. **Data Parity Score (0-100):** Document counts, index metadata
2. **Relevance Score (0-100):** NDCG, ranking correlation
3. **Business Impact Score (0-100):** CTR, conversion rate
4. **Performance Score (0-100):** Latency, throughput
5. **Risk Score (0-100):** Query translation coverage

## Scoring Logic
Overall Confidence = weighted_average(
  Data Parity: 20%,
  Relevance: 30%,
  Business Impact: 30%,
  Performance: 10%,
  Risk Assessment: 10%
)

Recommendation:
  >= 90: Ready for production
  80-89: Ready with minor concerns
  70-79: Needs investigation
  < 70: Not recommended

## Acceptance Criteria
- [ ] Create MigrationConfidenceScorer class
- [ ] Aggregate metrics from all validation sources
- [ ] Calculate weighted confidence score (0-100)
- [ ] Provide per-keyspace confidence scores
- [ ] Generate confidence trend over time
- [ ] Create recommendation engine (ready/not ready)
- [ ] Display confidence score in Migration Console
- [ ] Unit tests for scoring algorithm
- [ ] Integration tests with real migration data
```

## Example: Well-Written Task

**Summary**: Add Jenkins test for Serverless Target

**Description**:
```markdown
Add comprehensive Jenkins CI/CD test coverage for migrations targeting 
OpenSearch Serverless. This ensures that serverless-specific migration 
scenarios are validated automatically in the build pipeline.

## Acceptance Criteria
- [ ] Jenkins test suite includes serverless target test cases
- [ ] Tests validate successful migration to OpenSearch Serverless
- [ ] Tests cover authentication and authorization for serverless
- [ ] Tests verify data integrity after migration to serverless
- [ ] Tests validate performance meets acceptable thresholds
- [ ] Tests run automatically on relevant code changes
- [ ] Test results are reported clearly in Jenkins
- [ ] Failed tests provide actionable error messages
- [ ] Test execution time is reasonable (<30 minutes)
```

## Checklist Before Creating

- [ ] **Summary** is clear and specific
- [ ] **Type** is correct (Epic/Story/Task/Bug)
- [ ] **Component(s)** assigned
- [ ] **Fix Version** set if known
- [ ] **Priority** set appropriately
- [ ] **Description** includes acceptance criteria
- [ ] **Labels** added if applicable
- [ ] **Epic Link** set for Stories/Tasks

## JQL Quick Reference

```sql
-- My open issues
assignee = currentUser() AND status != Done

-- Issues in current sprint
project = MIGRATIONS AND Sprint in openSprints()

-- Bugs by priority
project = MIGRATIONS AND issuetype = Bug ORDER BY priority DESC

-- Recently updated
project = MIGRATIONS AND updated >= -7d ORDER BY updated DESC

-- Unassigned in backlog
project = MIGRATIONS AND assignee IS EMPTY AND status = "To Do"

-- By component
project = MIGRATIONS AND component = "RFS"

-- By fix version
project = MIGRATIONS AND fixVersion = "MAv3.0"

-- Epics with children
project = MIGRATIONS AND issuetype = Epic AND "Epic Link" IS NOT EMPTY
```
