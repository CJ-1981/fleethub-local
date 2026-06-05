# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FleetHub is a **zero-backend fleet management system** consisting of a single `index.html` file (~2800 lines) with inline CSS and JavaScript. The app uses [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly) as its database engine, with the File System Access API for direct `.sqlite` file read/write. No build process, no server, no backend.

**Key constraint**: This is a single-file application. All code lives in `index.html` with no external modules or build step.

## Architecture

### File Structure

```text
index.html                # Single-file app (~2800 lines)
  ├─ <style>             # All CSS (inline)
  ├─ <div id="app">       # DOM structure for landing page and main app
  ├─ <script>            # All JavaScript logic
  └─ <script>            # sql.js CDN (WebAssembly SQLite)
```

### JavaScript Organization (by section comments)

1. **STATE** — Global state object `S` with all application state
2. **SQLITE DATA LAYER** — Database initialization, query helpers (`dbQuery()`, `dbScalar()`), CRUD accessors (`getVehicles()`, `getBookings()`, `getSetting()`, `setSetting()`, `getMeta()`, `setMeta()`, `getData()`)
3. **ARCHIVE FUNCTIONS** — Auto-archive old bookings, query archived data by year
4. **FILE I/O** — File System Access API operations (`openFile`, `saveFile`, `exportJSON`, `importJSON`, `createNewFile`, `importJSONToSQLite`)
5. **RECENT FILES** — localStorage-based recent files list
6. **LOCKING** — File locking via `BroadcastChannel` and lock metadata in SQLite `meta` table
7. **APP LIFECYCLE** — `enterApp()`, `closeApp()`, demo mode
8. **NAVIGATION** — Tab switching (`setTab()`, `renderNav()`)
9. **RENDER** — Main `render()` function that delegates to tab-specific renderers
10. **DASHBOARD** — Stats cards and vehicle status overview
11. **VEHICLES** — Vehicle CRUD operations and table rendering
12. **BOOKINGS** — Booking management with pagination, search, filters
13. **SETTINGS** — Configurable statuses, vehicle types, custom columns, archive settings, AI settings
14. **DIALOG** — Modal dialogs for forms
15. **CHAT** — AI assistant (local mode or API mode) with Markdown rendering and OpenAI function calling
16. **TOAST** — Notification system
17. **KEYBOARD SHORTCUTS** — Ctrl+S (save), Ctrl+N (new booking)
18. **INIT** — Event listeners and startup

### State Management

All UI state lives in a single global object `S`. Data is backed by SQLite — use accessor functions instead of direct property access:

```javascript
const S = {
  fileHandle: null,           // File System Access API handle
  fileName: '',               // Current filename
  demoMode: false,            // Whether demo mode is active
  dirty: false,               // Unsaved changes flag
  saving: false,              // Save in progress flag
  activeTab: 'dashboard',     // Current active tab
  lockId: null,               // Current lock ID (session-generated via uid())
  lockUser: null,             // Lock holder user name
  lockedBy: null,             // Who holds the lock
  editingVehicle: null,       // Vehicle being edited (ID or null)
  editingBooking: null,       // Booking being edited (ID or null)
  shareDialogBooking: null,    // Booking being shared
  bookingSearch: '',          // Search filter text
  bookingVehicleFilter: '',    // Vehicle filter
  bookingStatusFilter: '',     // Status filter
  bookingPage: 1,             // Current pagination page
  pageSize: 10,               // Items per page
  chatMessages: [],            // AI chat history
  chatLoading: false,         // AI chat loading state
  openSections: ['booking', 'data'],  // Expanded settings sections
  calendarView: 'week',       // Calendar view mode
  calendarStart: new Date().toISOString(), // Calendar start date
  settingsTab: 'booking',     // Active settings sub-tab
  archiveYear: null,          // Selected archive year
};
```

**Pattern**: All mutations update SQLite via `db.run()` / `setSetting()` / `setMeta()`, then call `render()` to re-render the current tab.

### SQLite Data Layer

The app uses sql.js (SQLite → WebAssembly) loaded from CDN. Key helper functions:

```javascript
// Core query helpers
dbQuery(sql, params)          // Execute SELECT, returns array of objects
dbScalar(sql, params)         // Execute SELECT, returns first cell value or null

// Settings accessors (JSON-encoded in settings table)
getSetting(key, defaultVal)    // Get setting value (auto-parses JSON)
setSetting(key, value)         // Set setting value (auto JSON.stringify)

// Metadata accessors (plain text in meta table)
getMeta(key, defaultVal)       // Get meta value
setMeta(key, value)            // Set meta value

// Data accessors
getVehicles()                  // SELECT from vehicles table (sorted by sort_order)
getBookings()                  // SELECT from bookings table (sorted by updated_at DESC)
getSettings()                  // Aggregate all settings into one object
getData()                      // Full data export (meta + vehicles + bookings + settings)

// Database lifecycle
initSqlJsModule()              // Load sql.js WASM module (cached)
createDatabase()               // Create fresh DB with all tables
importJSONToSQLite(jsonData)   // Migrate legacy JSON format to SQLite
initDefaultSettings()          // Populate default settings values
```

### Database Schema

Five tables: `meta`, `vehicles`, `bookings`, `settings`, `archived_bookings`. See README.md for full schema details.

### Rendering Pattern

Each tab has a dedicated `render*()` function:

```javascript
function render() {
  const main = document.querySelector('.main-content');
  main.innerHTML = '';

  switch (S.activeTab) {
    case 'dashboard': renderDashboard(); break;
    case 'vehicles': renderVehicles(); break;
    case 'bookings': renderBookings(); break;
    case 'settings': renderSettings(); break;
    case 'calendar': renderCalendar(); break;
  }

  renderNav();
}
```

**Pattern**: Render functions create DOM elements using `document.createElement()` and append to the main container. No template system — all DOM is built programmatically. `renderBookingsTable()` preserves search input focus during partial re-renders.

### File Locking

Multi-user coordination via file locking:

1. **Lock acquisition** — On file open, generate session-unique lock ID via `uid()`, write to `meta` table
2. **Lock detection** — Subsequent opens check `meta.lockedBy` and `meta.lockedAt`
3. **Stale lock override** — Locks older than 5 minutes can be taken over
4. **Cross-tab sync** — `BroadcastChannel` broadcasts lock changes across browser tabs
5. **Lock release** — On tab close (`beforeunload`) or explicit "close file"
6. **Lock badge** — Header shows lock state (owned/locked/unlocked) with appropriate icon

**Implementation**: Lock state stored in SQLite `meta` table, enforced by UI warnings (no hard block).

### Demo Mode

Demo mode loads `getDemoData()` with pre-populated vehicles and bookings into SQLite. Changes are not saved to disk.

**Key difference**: `S.demoMode = true` disables save operations and shows a demo banner.

### AI Assistant

Two modes:

1. **Local mode** — Returns static fleet data summaries based on current DB state
2. **API mode** — Connect to any OpenAI-compatible endpoint with function calling

AI tools available in API mode:
- `create_booking` — Create new booking (dynamic status enum from settings)
- `update_vehicle_status` — Change vehicle status (dynamic enum from settings)
- `cancel_booking` — Cancel booking by ID
- `list_vehicles` — List all vehicles
- `list_bookings` — List/filter bookings

Assistant messages are rendered as Markdown via `marked.js`.

Configuration via `localStorage`:

```javascript
localStorage.setItem('fleethub_ai_endpoint', 'https://api.openai.com/v1/chat/completions');
localStorage.setItem('fleethub_ai_key', 'your-api-key');
localStorage.setItem('fleethub_ai_model', 'gpt-4o-mini');
```

## Development Commands

### Running the App

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: Open directly (Chromium browsers only)
# Open index.html directly in Chrome/Edge/Opera
```

### Testing File Operations

1. Open `index.html` in Chrome/Edge/Opera
2. Click "Open Fleet Data" and select a `.sqlite` or `.json` file
3. Edit vehicles/bookings and save with Ctrl+S
4. Verify changes persisted in the file

### Testing JSON Migration

1. Open `index.html`
2. Click "Import JSON File" and select `fleet-data.sample.json`
3. Data will be converted to SQLite automatically
4. Edit and save — it saves as `.sqlite` going forward

### Testing Locking

1. Open `index.html` in two tabs
2. Open the same `.sqlite` file in both tabs
3. Second tab should show lock warning
4. Try taking over the lock (wait 15 minutes for stale lock)

## Key Functions

### File Operations

- `openFile()` — File System Access API open (supports `.sqlite` and `.json`)
- `saveFile()` — Export SQLite DB to binary file
- `createNewFile()` — Create new `.sqlite` file with initialized schema
- `exportJSON()` — Export current data as downloadable JSON
- `importJSON()` — Import JSON file (legacy format)
- `importJSONToSQLite(jsonData)` — Convert JSON data object to SQLite tables

### CRUD Operations

- Vehicles: `editVehicle(id)`, `deleteVehicle(id)`, `saveVehicle()`
- Bookings: `editBooking(id)`, `deleteBooking(id)`, `saveBooking()`

### Navigation

- `setTab(tab)` — Switch active tab and re-render
- `renderNav()` — Re-render navigation with updated badges

### Utilities

- `genId()` — Generate unique ID (timestamp + random)
- `uid()` — Generate session-unique lock ID
- `esc(s)` — HTML escape
- `fmtDate(d)`, `fmtDateTime(d)` — Date formatting
- `isActive(booking)` — Check if booking is currently active
- `showToast(msg, type)` — Show notification
- `getAITools()` — Build dynamic AI tool definitions from current settings

## CSS Architecture

CSS is inline in the `<style>` section with CSS custom properties for theming:

- Colors: `--primary`, `--surface-soft`, `--hairline`, etc.
- Spacing: `--radius-sm`, `--radius-md`, `--radius-lg`
- Layout: `--header-h`, `--sidebar-w`

**Pattern**: Classes follow BEM-ish naming (`.tab-header`, `.tab-header-actions`, `.save-indicator.unsaved`).

## Browser Compatibility

- **Full support**: Chrome, Edge, Opera (File System Access API + WebAssembly)
- **Limited support**: Firefox, Safari — can use Import/Export for file operations; no direct read/write
- **Secure context required**: HTTPS or localhost

## Common Tasks

### Adding a New Column to a Table

1. Add column to `CREATE TABLE` in `createDatabase()`
2. Update the corresponding `INSERT` statement
3. Update the accessor function (e.g., `getVehicles()`) to include the column
4. Update `importJSONToSQLite()` to map the legacy JSON field
5. Update the `render*()` function to display/edit the field
6. Update the `saveVehicle()` / `saveBooking()` SQL to persist the field
7. Update `exportJSON()` / `getData()` to include the field

### Changing the UI Theme

Modify CSS custom properties in `:root` within the `<style>` section.

### Adding a New Tab

1. Add tab case to `render()` switch statement
2. Create `render[TabName]()` function
3. Add navigation item in `renderNav()`

## Important Notes

- **No build process**: All changes must be made directly in `index.html`
- **SQLite via WebAssembly**: sql.js loaded from CDN; database lives entirely in browser memory, written to disk as `.sqlite` binary
- **JSON migration**: Legacy `.json` files are automatically converted to SQLite on import; all settings keys are preserved
- **File locking is cooperative**: UI warnings only, no hard enforcement
- **Demo mode changes are ephemeral**: Not saved to disk
- **Single state object**: UI state goes through `S`; data goes through SQLite accessor functions
- **Re-render everything**: No fine-grained DOM updates — `render()` rebuilds the current tab from scratch (exception: `renderBookingsTable()` preserves search focus)
- **Dynamic AI tool enums**: Status enums for AI function calling are dynamically built from current settings via `getAITools()`
- **Session-based lock IDs**: Lock IDs are generated per browser session (not persisted in localStorage) to avoid cross-tab ID collisions

## Code Review Harness: FleetHub

**Goal:** Systematically review code changes for correctness, security, and frontend quality.

**Trigger:** Use the `code-review-orchestrator` skill when asked for code reviews, diff checks, bug finding, PR reviews, change audits, or security reviews. Simple questions can be answered directly.

**Change History:**

| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-05-31 | Initial setup | All | Frontend expert team for calendar view color cell fix |
| 2026-06-01 | Code review harness added | agents/fleethub-code-reviewer.md, agents/fleethub-security-reviewer.md, skills/code-review-orchestrator | 2-person reviewer team for accuracy, security, and frontend quality |
| 2026-06-02 | SQLite migration documented | README.md, CLAUDE.md | Updated docs to reflect JSON → SQLite migration |
