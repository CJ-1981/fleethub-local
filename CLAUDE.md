# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetHub is a **zero-backend fleet management system** consisting of a single `index.html` file (2500+ lines) with inline CSS and JavaScript. The app uses the File System Access API to read/write JSON files directly in the browser, with no build process, no server, and no dependencies.

**Key constraint**: This is a single-file application. All code lives in `index.html` with no external modules or build step.

## Architecture

### File Structure

```text
index.html                # Single-file app (~2500 lines)
  ├─ <style>             # All CSS (inline)
  ├─ <div id="app">       # DOM structure for landing page and main app
  └─ <script>            # All JavaScript logic
```

### JavaScript Organization (by section comments)

1. **STATE** — Global state object `S` with all application state
2. **FILE I/O** — File System Access API operations (`openFile`, `saveFile`, `exportJSON`, `importJSON`)
3. **RECENT FILES** — localStorage-based recent files list
4. **LOCKING** — File locking via `BroadcastChannel` and lock metadata in JSON
5. **APP LIFECYCLE** — `enterApp()`, `closeApp()`, demo mode
6. **NAVIGATION** — Tab switching (`setTab()`, `renderNav()`)
7. **RENDER** — Main `render()` function that delegates to tab-specific renderers
8. **DASHBOARD** — Stats cards and vehicle status overview
9. **VEHICLES** — Vehicle CRUD operations and table rendering
10. **BOOKINGS** — Booking management with pagination, search, filters
11. **SETTINGS** — Configurable statuses, vehicle types, custom columns, AI settings
12. **DIALOG** — Modal dialogs for forms
13. **CHAT** — AI assistant (local mode or API mode)
14. **TOAST** — Notification system
15. **KEYBOARD SHORTCUTS** — Ctrl+S (save), Ctrl+N (new booking)
16. **INIT** — Event listeners and startup

### State Management

All application state lives in a single global object `S`:

```javascript
const S = {
  fileHandle: null,           // File System Access API handle
  fileName: '',               // Current filename
  data: null,                 // Full JSON data object
  dirty: false,               // Unsaved changes flag
  saving: false,              // Save in progress flag
  activeTab: 'dashboard',     // Current active tab
  lockId: null,               // Current lock ID
  editingVehicle: null,       // Vehicle being edited (ID or null)
  editingBooking: null,       // Booking being edited (ID or null)
  // ... pagination, search, filters, chat state
};
```

**Pattern**: All mutations update `S` directly, then call `render()` to re-render the current tab.

### Data Model

The JSON file contains four top-level keys:

- `meta` — Version, timestamps, lock metadata
- `vehicles` — Array of vehicle objects
- `bookings` — Array of booking objects
- `settings` — Configurable statuses, types, custom columns, AI config

See `fleet-data.sample.json` for the complete schema.

### Rendering Pattern

Each tab has a dedicated `render*()` function:

```javascript
function render() {
  // Clear main content
  const main = document.querySelector('.main-content');
  main.innerHTML = '';
  
  // Delegate to tab-specific renderer
  switch (S.activeTab) {
    case 'dashboard': renderDashboard(); break;
    case 'vehicles': renderVehicles(); break;
    case 'bookings': renderBookings(); break;
    case 'settings': renderSettings(); break;
    case 'calendar': renderCalendar(); break;
  }
  
  // Always re-render nav to update badges
  renderNav();
}
```

**Pattern**: Render functions create DOM elements using `document.createElement()` and append to the main container. No template system — all DOM is built programmatically.

### File Locking

Multi-user coordination via file locking:

1. **Lock acquisition** — On file open, generate lock ID, write to `data.meta`
2. **Lock detection** — Subsequent opens check `data.meta.lockedBy` and `data.meta.lockedAt`
3. **Stale lock override** — Locks older than 5 minutes can be taken over
4. **Cross-tab sync** — `BroadcastChannel` broadcasts lock changes across tabs
5. **Lock release** — On tab close or explicit "close file"

**Implementation**: Lock state stored in JSON metadata, enforced by UI warnings (no hard block).

### Demo Mode

Demo mode loads `getDemoData()` with pre-populated vehicles and bookings. Changes are not saved to disk.

**Key difference**: `S.demoMode = true` disables save operations and shows a demo banner.

## Development Commands

### Running the App

```bash
# Serve the file (requires HTTPS or localhost for File System Access API)
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: Open directly (Chromium browsers only)
# Open index.html directly in Chrome/Edge/Opera
```

### Testing File Operations

1. Open `index.html` in Chrome/Edge/Opera
2. Click "Open Fleet Data" and select `fleet-data.sample.json`
3. Edit vehicles/bookings and save with Ctrl+S
4. Verify changes persisted in the JSON file

### Testing Locking

1. Open `index.html` in two tabs
2. Open the same file in both tabs
3. Second tab should show lock warning
4. Try taking over the lock (wait 5 minutes for stale lock)

## Key Functions

### File Operations

- `openFile()` — File System Access API open
- `saveFile()` — Write current state to disk
- `exportJSON()` — Download JSON as file
- `importJSON()` — Import JSON from file

### CRUD Operations

- Vehicles: `editVehicle(id)`, `deleteVehicle(id)`, `saveVehicle()`
- Bookings: `editBooking(id)`, `deleteBooking(id)`, `saveBooking()`

### Navigation

- `setTab(tab)` — Switch active tab and re-render
- `renderNav()` — Re-render navigation with updated badges

### Utilities

- `genId()` — Generate unique ID (timestamp + random)
- `esc(s)` — HTML escape
- `fmtDate(d)`, `fmtDateTime(d)` — Date formatting
- `isActive(booking)` — Check if booking is currently active
- `showToast(msg, type)` — Show notification

## CSS Architecture

CSS is inline in the `<style>` section with CSS custom properties for theming:

- Colors: `--primary`, `--surface-soft`, `--hairline`, etc.
- Spacing: `--radius-sm`, `--radius-md`, `--radius-lg`
- Layout: `--header-h`, `--sidebar-w`

**Pattern**: Classes follow BEM-ish naming (`.tab-header`, `.tab-header-actions`, `.save-indicator.unsaved`).

## Browser Compatibility

- **File System Access API**: Chrome, Edge, Opera (Chromium)
- **Fallback**: Import/Export works in Firefox/Safari (no direct file read/write)
- **Secure context required**: HTTPS or localhost

## AI Assistant

Two modes:

1. **Local mode** — Returns static fleet data summaries
2. **API mode** — Connect to OpenAI-compatible endpoint

Configuration via `localStorage`:

```javascript
localStorage.setItem('fleethub_ai_endpoint', 'https://api.openai.com/v1/chat/completions');
localStorage.setItem('fleethub_ai_key', 'your-api-key');
localStorage.setItem('fleethub_ai_model', 'gpt-4o-mini');
```

## Common Tasks

### Adding a New Field to Vehicles/Bookings

1. Update the sample data schema in `fleet-data.sample.json`
2. Update `getDefaultData()` to include the new field
3. Update the corresponding `render*()` function to display/edit the field
4. Update `saveVehicle()` or `saveBooking()` to persist the field

### Changing the UI Theme

Modify CSS custom properties in `:root` within the `<style>` section.

### Adding a New Tab

1. Add tab case to `render()` switch statement
2. Create `render[TabName]()` function
3. Add navigation item in `renderNav()`

## Important Notes

- **No build process**: All changes must be made directly in `index.html`
- **No external dependencies**: All icons are inline SVG, fonts from Google Fonts
- **File locking is cooperative**: UI warnings only, no hard enforcement
- **Demo mode changes are ephemeral**: Not saved to disk
- **Single state object**: All mutations go through `S`
- **Re-render everything**: No fine-grained DOM updates — `render()` rebuilds the current tab from scratch

## 하네스: FleetHub Code Review

**목표:** 코드 변경 사항의 정확성, 보안, 프론트엔드 품질을 체계적으로 리뷰

**트리거:** 코드 리뷰, diff 확인, 버그 찾기, PR 리뷰, 변경 사항 감사, 보안 검토 요청 시 `code-review-orchestrator` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-31 | 초기 구성 | 전체 | 캘린더 뷰 컬러 셀 문제 해결을 위해 프론트엔드 전문가 팀 구성 |
| 2026-06-01 | 코드 리뷰 하네스 추가 | agents/fleethub-code-reviewer.md, agents/fleethub-security-reviewer.md, skills/code-review-orchestrator | 코드 변경 사항의 정확성·보안·프론트엔드 품질을 체계적으로 리뷰하기 위해 2인 리뷰어 팀 구성 |
