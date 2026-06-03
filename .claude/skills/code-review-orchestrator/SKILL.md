---
name: code-review-orchestrator
description: "Orchestrate FleetHub code review team for comprehensive diff analysis. Coordinates code correctness and security reviewers to find bugs, vulnerabilities, and quality issues. Use when: 'review code', 'code review', 'check the diff', 'review this PR', 'audit changes', 'find bugs in my changes', 'security review', re-run review, partial re-review of specific area, or improve previous review results."
---

# Code Review Orchestrator

Coordinate a team of specialized reviewers to comprehensively review FleetHub `index.html` changes.

## Execution Mode: Agent Team

Two reviewers work in parallel, share findings via SendMessage, and challenge each other's conclusions.

## Agent Composition

| Teammate | Agent Type | Role | Skill | Output |
|----------|------------|------|-------|--------|
| code-reviewer | Explore | Correctness & logic | fleethub-code-review | `_workspace/{phase}_code-reviewer_findings.md` |
| security-reviewer | Explore | Security & frontend | fleethub-security-review | `_workspace/{phase}_security-reviewer_findings.md` |

> Both use `Explore` type (read-only) since reviewers should not modify code.

## Workflow

### Phase 0: Context Check (Re-run Support)

1. Check if `_workspace/` exists
2. Determine execution mode:
   - **`_workspace/` missing** → Initial run, proceed to Phase 1
   - **`_workspace/` exists + user requests partial re-review** → Re-run only the relevant reviewer
   - **`_workspace/` exists + new diff provided** → Archive old workspace as `_workspace_{timestamp}/`, proceed to Phase 1

### Phase 1: Preparation

1. Get the diff to review:
   - If user specifies a commit range: `git diff {range}`
   - If user says "review staged changes": `git diff --cached`
   - If user says "review last commit": `git diff HEAD~1`
   - Default: `git diff HEAD` (all uncommitted changes)
2. Create `_workspace/` directory
3. Save diff to `_workspace/00_input_diff.patch`
4. Count changed lines to estimate review scope

### Phase 2: Team Formation

1. Create team:
   ```
   TeamCreate(
     team_name: "review-team",
     members: [
       { name: "code-reviewer", agent_type: "Explore", model: "opus",
         prompt: "Review the diff at _workspace/00_input_diff.patch for correctness issues.
                  Use the fleethub-code-review skill. Write findings to
                  _workspace/02_code-reviewer_findings.md.
                  Share security-relevant findings with security-reviewer via SendMessage." },
       { name: "security-reviewer", agent_type: "Explore", model: "opus",
         prompt: "Review the diff at _workspace/00_input_diff.patch for security and
                  frontend issues. Use the fleethub-security-review skill. Write findings to
                  _workspace/02_security-reviewer_findings.md.
                  Share correctness-relevant findings with code-reviewer via SendMessage." }
     ]
   )
   ```

2. Register tasks:
   ```
   TaskCreate([
     { subject: "Review diff for correctness", description: "Check SQL, state, rendering, logic", owner: "code-reviewer" },
     { subject: "Review diff for security", description: "Check XSS, injection, DOM safety, CSS, performance", owner: "security-reviewer" },
     { subject: "Cross-review shared findings", description: "Discuss findings that cross boundaries", owner: "both" }
   ])
   ```

### Phase 3: Parallel Review

**Execution:** Team members work independently, coordinate via SendMessage

**Communication rules:**
- code-reviewer → security-reviewer: "Finding N has security implications: [details]"
- security-reviewer → code-reviewer: "Finding N affects correctness: [details]"
- Both → orchestrator: Completion notification when done

**Leader monitoring:**
- Receive idle notifications when reviewers finish
- If a reviewer is stuck, SendMessage with guidance
- Check TaskList for overall progress

### Phase 4: Integration

1. Wait for both reviewers to complete (TaskList shows all tasks completed)
2. Read both findings files
3. Deduplicate findings that appear in both reports
4. Merge into unified report with severity ordering
5. Generate final report: `_workspace/03_review_summary.md`

**Final report structure:**
```markdown
# Code Review Summary

## Overview
- Files changed: {N}
- Lines added/removed: +{X}/-{Y}
- Total findings: {N} ({critical} critical, {high} high, {medium} medium, {low} low)

## Critical & High Findings
{Combined findings, severity ordered}

## Medium & Low Findings
{Combined findings, severity ordered}

## Cross-Cutting Concerns
{Findings flagged by both reviewers}

## Recommendations
{Prioritized action items}
```

### Phase 5: Cleanup

1. Send shutdown requests to team members
2. Delete team (TeamDelete)
3. Workspace preserved as `_workspace/` (Phase 0 will rename with timestamp on next run if needed)
4. Report summary to user

## Data Flow

```
[Orchestrator]
    ├── git diff → _workspace/00_input_diff.patch
    ├── TeamCreate → [code-reviewer] ←──SendMessage──→ [security-reviewer]
    │                    │                                    │
    │                    ↓                                    ↓
    │         _workspace/02_code-reviewer_findings.md   _workspace/02_security-reviewer_findings.md
    │                    │                                    │
    │                    └────────────── Read ────────────────┘
    │                                    ↓
    └── Merge & deduplicate → _workspace/03_review_summary.md
```

## Error Handling

| Situation | Strategy |
|-----------|----------|
| One reviewer fails | Retry once. If still fails, proceed with partial results and note the gap |
| Both reviewers fail | Report error to user, suggest manual review |
| Diff too large (>1000 lines) | Warn user, suggest splitting into multiple reviews |
| No findings | Report "No issues found" with scope disclaimer |

## Test Scenarios

### Normal Flow
1. User: "review the last commit"
2. Phase 1: Get diff, save to workspace
3. Phase 2: Create team with 2 reviewers
4. Phase 3: Reviewers work in parallel, share 1-2 cross-cutting findings
5. Phase 4: Merge into summary with 5-10 findings
6. Phase 5: Clean up, report to user
7. Expected: `_workspace/03_review_summary.md` generated

### Error Flow
1. User: "review staged changes"
2. Phase 1: No staged changes found
3. Report: "No staged changes to review. Try 'git add' first or use 'review last commit'."

## Notes

- Reviewers use `Explore` type (read-only) to prevent accidental code modifications
- All findings include line numbers for easy navigation
- Severity is subjective — when in doubt, mark as Medium and explain uncertainty
