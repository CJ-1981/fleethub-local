---
name: fleethub-security-review
description: "Review FleetHub index.html code changes for security vulnerabilities, XSS risks, DOM safety issues, CSS inconsistencies, and performance problems. Use this skill when asked to review security, check for vulnerabilities, audit frontend patterns, or assess performance impact. Triggers: 'security review', 'check for XSS', 'audit security', 'review frontend', 'performance check'."
---

# FleetHub Security & Frontend Review

Review `index.html` diffs for security vulnerabilities and frontend quality. This skill is invoked by the orchestrator as part of the code review team.

## Context

FleetHub is a single-file app that:
- Opens `.sqlite` files from the user's filesystem (could be untrusted)
- Uses `document.createElement()` for safe DOM manipulation
- Has inline CSS with custom properties for theming
- Re-renders entire tabs on state changes

## Review Checklist

### 1. Security
```
- innerHTML: Never used with user-controlled data
- SQL queries: Always parameterized, never concatenated
- API keys: Not logged or exposed in DOM attributes
- Lock takeover: Requires valid lock ID, respects 5-minute staleness
- File validation: .sqlite extension checked before processing
```

### 2. DOM Safety
```
- Element creation: document.createElement() preferred over innerHTML
- Text content: textContent for plain text, innerHTML only for trusted HTML
- Event handlers: Attached via addEventListener, not inline attributes
- URL handling: No javascript: URLs, proper validation for href/src
```

### 3. CSS Consistency
```
- Custom properties: Use --primary, --surface-soft, --radius-md, etc.
- Class naming: BEM-ish pattern (.tab-header, .tab-header-actions)
- Responsive: New elements work on different screen sizes
- Theme compatibility: Dark/light mode variables respected
```

### 4. Performance
```
- Re-render scope: render() only called when necessary
- Pagination: Large lists (bookings) use pagination
- SQL efficiency: Queries use WHERE clauses, not full scans
- Event cleanup: Listeners removed when elements destroyed
- BroadcastChannel: Proper cleanup on tab close
```

## Output Format

Write findings to `_workspace/{phase}_security-reviewer_findings.md`:

```markdown
# Security & Frontend Review Findings

## Finding 1: [Critical] XSS via innerHTML in booking notes
**Category:** Security
**Location:** `index.html` line 890
**Issue:** Booking notes rendered with innerHTML without escaping
**Risk:** Opening a malicious .sqlite file could execute JavaScript
**Suggestion:** Use textContent or escape HTML with esc() function

## Finding 2: [Low] Inconsistent CSS variable usage
**Category:** Frontend
**Location:** `index.html` line 123
**Issue:** New button uses hardcoded color instead of --primary
**Risk:** Theme changes won't affect this element
**Suggestion:** Replace #1a73e8 with var(--primary)
```

## Severity Guide

| Severity | Security | Frontend/Performance |
|----------|----------|---------------------|
| Critical | Exploitable vulnerability, data exposure | App crash, memory leak |
| High | Potential exploit under specific conditions | Major UX degradation |
| Medium | Defense-in-depth gap | Inconsistency, minor perf issue |
| Low | Theoretical risk | Style nit, negligible perf impact |

## What NOT to Flag

- Security issues that require physical access to the user's machine
- Performance issues that only affect unrealistic data sizes (100k+ rows)
- CSS preferences that don't affect functionality or consistency
- Missing security headers (this is a local-first app, not a web service)
