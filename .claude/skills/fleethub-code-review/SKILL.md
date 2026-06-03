---
name: fleethub-code-review
description: "Review FleetHub index.html code changes for correctness, logic bugs, SQL issues, state management problems, and rendering errors. Use this skill when asked to review code, check a diff, find bugs, or audit changes in the FleetHub app. Triggers: 'review this code', 'check the diff', 'find bugs', 'code review', 'audit changes', 'look for issues'."
---

# FleetHub Code Review

Review `index.html` diffs for correctness and logic issues. This skill is invoked by the orchestrator as part of the code review team.

## Context

FleetHub is a single-file app (~2500+ lines) with:
- **sql.js** (SQLite via WebAssembly) for data storage
- **File System Access API** for reading/writing `.sqlite` files
- **Global state object `S`** for UI state
- **`dbQuery()`/`dbRun()`** for all database operations
- **`render*()` functions** that rebuild DOM from scratch

## Review Checklist

### 1. SQL Operations
```
- dbQuery(sql, params): SELECT returns array of objects
- dbRun(sql, params): INSERT/UPDATE/DELETE affects rows
- Parameterized queries: No string concatenation in SQL
- Schema compatibility: New queries work with existing tables
```

### 2. State Management
```
- S.dirty: Set to true after mutations, false after save
- S.editingVehicle/editingBooking: Set before dialog, cleared after
- Pagination: S.bookingPage adjusted after deletions
- Search/filter: State preserved across re-renders
```

### 3. Rendering
```
- render() clears .main-content and delegates to tab renderer
- Event handlers: Closures capture correct element references
- Conditional branches: All cases handled (empty state, loading, error)
- Badge counts: Aggregation matches actual data
```

### 4. Business Logic
```
- isActive(booking): start <= now <= end
- archiveOldBookings(): Retention period calculation
- Lock staleness: 15-minute threshold
- Date formatting: fmtDate() handles null/undefined
```

## Output Format

Write findings to `_workspace/{phase}_code-reviewer_findings.md`:

```markdown
# Code Review Findings

## Finding 1: [Critical] SQL injection in search query
**Location:** `index.html` line 1234
**Issue:** Search parameter concatenated into SQL string
**Impact:** Malicious input could modify query behavior
**Suggestion:** Use parameterized query: `dbQuery("SELECT * FROM bookings WHERE name LIKE ?", ['%' + search + '%'])`

## Finding 2: [Medium] Stale pagination after delete
**Location:** `index.html` line 567
**Issue:** After deleting last item on page, S.bookingPage not decremented
**Impact:** User sees empty page
**Suggestion:** Add `if (S.bookingPage > 1 && itemsOnPage === 0) S.bookingPage--`
```

## Severity Guide

| Severity | Criteria |
|----------|----------|
| Critical | Data loss, security vulnerability, app crash |
| High | Incorrect behavior, broken feature |
| Medium | Edge case failure, poor UX |
| Low | Code clarity, minor inefficiency |

## What NOT to Flag

- Style preferences (naming, formatting)
- Theoretical issues without practical impact
- Patterns that are consistent with existing code
- Missing features (only review what's changed)
