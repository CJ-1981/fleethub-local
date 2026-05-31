# FleetHub — Local File Mode

**Zero-backend fleet management.** A single HTML file that uses a JSON file as its database. No server, no login, no external services required.

![FleetHub](https://img.shields.io/badge/FleetHub-Local_File_Mode-181d26?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMSIgeT0iMyIgd2lkdGg9IjE1IiBoZWlnaHQ9IjEzIiByeD0iMiIvPjxwYXRoIGQ9Ik0xNiA4aDRhMiAyIDAgMCAxIDIgMnY2YTIgMiAwIDAgMS0yIDJoLTIiLz48Y2lyY2xlIGN4PSI1LjUiIGN5PSIxOC41IiByPSIyLjUiLz48Y2lyY2xlIGN4PSIxOC41IiBjeT0iMTguNSIgcj0iMi41Ii8+PC9zdmc+)

## Features

- **Single HTML file** — No build step, no dependencies, no server
- **JSON as database** — Your data lives in a `.json` file you control
- **Airtable-inspired UI** — Clean, professional, hairline borders, subtle surfaces
- **No login required** — Open the file and start managing your fleet
- **File locking** — Prevents concurrent editing conflicts
- **OneDrive compatible** — Open JSON files from your synced OneDrive folder
- **GitHub Pages ready** — Host the HTML file; data stays local
- **AI Assistant** — Built-in fleet chat (local mode or connect your own API)
- **Keyboard shortcuts** — `Ctrl+S` to save, `Ctrl+N` for new booking

## Quick Start

1. **Open `index.html`** in Chrome, Edge, or Opera
2. Click **"Open Fleet Data"** and select your `fleet-data.json` file
3. Or click **"Create New File"** to start fresh

> The File System Access API (used for read/write) is supported in Chromium-based browsers. Firefox/Safari users can still use Import/Export.

## OneDrive Team Workflow

1. Place `fleet-data.json` in a shared OneDrive folder
2. Each team member opens `index.html` (locally or from GitHub Pages)
3. Click **"Open Fleet Data"** and navigate to the OneDrive synced folder
4. The first user to open the file acquires a **lock**
5. Subsequent users see a **lock warning** with option to take over
6. Save with `Ctrl+S` or the Save button — changes sync via OneDrive

## File Locking

- **Automatic lock** when first user opens the file
- **Lock alert** shown to subsequent users with the locker's ID and elapsed time
- **Stale lock detection** — locks older than 5 minutes can be taken over
- **BroadcastChannel** — cross-tab lock detection in the same browser
- **Auto-release** — lock is released when the tab is closed

## JSON Schema

```json
{
  "meta": {
    "version": "1.0",
    "lastModified": "ISO timestamp",
    "lockedBy": "user-id or null",
    "lockedAt": "ISO timestamp or null",
    "lockId": "lock-id or null"
  },
  "vehicles": [
    {
      "id": "unique-id",
      "name": "Vehicle Name",
      "type": "sedan|suv|pickup|van|bus|motorcycle|other",
      "licensePlate": "ABC-1234",
      "status": "available|in-use|maintenance|reserved",
      "notes": "Optional notes",
      "sortOrder": 0,
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  "bookings": [
    {
      "id": "unique-id",
      "vehicleId": "vehicle-id",
      "userName": "Name",
      "purpose": "Purpose",
      "periodStart": "ISO datetime",
      "periodEnd": "ISO datetime",
      "status": "pending|confirmed|in-use|returned|cancelled",
      "remarks": "Optional",
      "customFields": { "key": "value" },
      "shareWith": ["Co-passenger names"],
      "shareNote": "Optional message",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  "settings": {
    "statuses": ["pending", "confirmed", "in-use", "returned", "cancelled"],
    "vehicleTypes": ["sedan", "suv", "pickup", "van", "bus", "motorcycle", "other"],
    "customColumns": [
      { "id": "unique-id", "key": "department", "label": "Department", "type": "text" }
    ],
    "shareMessage": "Default carpool message"
  }
}
```

## Hosting on GitHub Pages

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to the `main` branch
4. Your app will be available at `https://username.github.io/fleethub-local/`

> Note: File System Access API requires a **secure context** (HTTPS or localhost). GitHub Pages serves over HTTPS, so it works.

## AI Assistant

The built-in AI assistant works in two modes:

1. **Local mode** (default) — Responds with fleet data summaries (available vehicles, pending bookings, etc.)
2. **API mode** — Connect any OpenAI-compatible API endpoint for intelligent responses

To configure API mode, open browser console and run:
```javascript
localStorage.setItem('fleethub_ai_endpoint', 'https://api.openai.com/v1/chat/completions');
localStorage.setItem('fleethub_ai_key', 'your-api-key');
localStorage.setItem('fleethub_ai_model', 'gpt-4o-mini');
```

## Screenshots

*Dashboard with fleet statistics and status overview*

*Booking management with search, filters, and conflict detection*

*Vehicle management with CRUD operations*

*Settings panel for customizing statuses, types, and fields*

## License

MIT
