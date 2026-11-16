# Loggo

Track when you last performed routine chores. A simple, mobile-first web app with Firebase sync.

## Setup

### Prerequisites

- Node.js 26+ (via asdf: `asdf install`)
- A Firebase project with Firestore enabled

### Firebase Configuration

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Cloud Firestore
3. Register a web app in Project Settings > General > Your apps
4. Edit `js/firebase-config.js` with your project's config values

The Firebase config is checked into the repo. This is safe — Firebase client API keys are designed to be public. Security is enforced by Firestore rules and unguessable URL secrets, not by key secrecy.

### Firestore Security Rules

Set these rules in the Firebase Console under Firestore > Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /loggo/{secret} {
      allow read, write: if secret.size() >= 32;
    }
  }
}
```

This requires secrets to be at least 32 characters, making brute force infeasible.

### Generate a Secret

```bash
openssl rand -hex 16
# produces a 32-character hex string, e.g.: a8f3c91b4e2d7f6a0c5b8e3d1a9f4c7b
```

Use this as the path in your URL: `https://<your-site>/a8f3c91b4e2d7f6a0c5b8e3d1a9f4c7b`

### Local Development

```bash
npm install
# Serve with any static file server:
npx serve .
# Open http://localhost:3000/your-secret
```

### Running Tests

```bash
npm test            # single run
npm run test:watch  # watch mode
```

### Deployment

Deploy to GitHub Pages — the app is entirely static files.

1. Go to repo Settings > Pages
2. Set source to "Deploy from a branch" > `main` / `/ (root)`
3. Access at `https://<username>.github.io/loggo/your-secret`

## Usage

- Navigate to `/your-secret` — the last path segment is your data key
- Create categories (Car, Lawn, etc.)
- Add actions under categories (Oil Change, Mow, etc.)
- Tap "Did it!" to log today's date
- Export/import JSON backups from the header buttons

## Data Structure

```json
{
  "categories": {
    "id1": { "name": "Car" }
  },
  "actions": {
    "id2": {
      "name": "Oil Change",
      "categoryId": "id1",
      "dates": ["2026-11-15", "2025-01-17"]
    }
  }
}
```

## Project Structure

```
loggo/
  index.html              # Single-page app shell
  404.html                # GitHub Pages SPA routing (redirects all paths to index.html)
  css/style.css           # Mobile-first responsive styles
  js/
    app.js                # Entry point — extracts secret from URL, wires store to UI
    data.js               # Pure data logic — all CRUD operations, import/export
    store.js              # Firebase Firestore read/write layer
    ui.js                 # DOM rendering — categories, actions, dates views
    firebase-config.js    # Firebase client config (safe to commit)
  tests/
    data.test.js          # Unit tests for data module (30 tests)
    ui.test.js            # UI rendering and interaction tests (13 tests)
  .github/workflows/
    test.yml              # CI — runs tests on every PR to main
  .tool-versions          # Pins Node 26.13.1 via asdf
```

## Architecture & Key Decisions

### Vanilla JS, no build step

The app uses plain ES modules loaded directly by the browser. There is no bundler, transpiler, or framework. This means the app can be served as static files from GitHub Pages with zero build infrastructure. Vitest is used only for testing and is not part of the production runtime.

### Separation of concerns

- **`data.js`** is a pure functional module with no side effects. Every function takes a dataset and returns a new dataset (immutable style via deep clone). This makes it trivially testable without any DOM or network mocking.
- **`store.js`** is the only module that touches Firebase. It reads and writes a single Firestore document.
- **`ui.js`** owns all DOM rendering. It imports data functions to mutate state and calls a save callback to persist.
- **`app.js`** is glue — it reads the URL, initializes the store, loads data, and connects the UI to the store.

### Single Firestore document per secret

All data for a given secret lives in one Firestore document at `loggo/{secret}`. This keeps reads and writes simple (one `getDoc`, one `setDoc`) and avoids complex queries. The dataset is small enough that document size limits (1MB) will never be a concern.

### URL path as secret

The last segment of the URL path acts as the data key (e.g., `/mysecret` or `/loggo/mysecret`). Different secrets produce completely isolated datasets — functionally equivalent to separate accounts without any authentication. GitHub Pages doesn't support server-side routing, so a `404.html` intercepts unknown paths and redirects to `index.html`, which restores the original path via `history.replaceState`.

### Security model

Firebase client API keys are public by design — they're visible in browser network traffic regardless of whether they're in source control. Security relies on two layers: Firestore rules that reject document IDs shorter than 32 characters, and the secrecy of the URL path. A 32-character hex secret provides 128 bits of entropy (same as UUID v4), making brute force infeasible.

### Immutable data operations

All data functions in `data.js` return new objects rather than mutating in place. This prevents subtle bugs from shared references and makes the data flow predictable: UI calls a data function, gets a new dataset, assigns it, then persists.

### Inline editing

Rename and date edit operations use inline forms (text inputs and date pickers with Save/Cancel) rather than browser `prompt()` dialogs. This provides a better UX, especially on mobile where native prompts can be disruptive.

### Sorting by most recently done

Categories and actions are sorted by the most recent date entry, so the things you do most frequently or most recently appear at the top. Categories with no actions sort to the bottom.

## Future Enhancements

- Recurrence schedules with visual indicators (green/yellow/red for overdue)
- Push notifications for overdue tasks
- Support for localstorage-only version 
- Add comments with action dates
