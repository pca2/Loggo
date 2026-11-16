import { initStore, loadData, saveData } from './store.js';
import { init as initUI } from './ui.js';
import { firebaseConfig } from './firebase-config.js';

function getSecret() {
  const path = window.location.pathname;
  // Remove trailing slash, split, take last non-empty segment
  const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
  // On GitHub Pages the first segment is the repo name, secret is the second.
  // Locally, the secret is the first (and only) segment.
  // Detect GitHub Pages by checking if we're served from a subpath with index.html.
  // Simple heuristic: if there are 2+ segments, last one is the secret.
  // If there's exactly 1 segment, it could be the secret (local) or repo name (GH Pages root).
  // We resolve this: if the page loaded successfully, the last segment is the secret.
  const secret = segments.length > 0 ? segments[segments.length - 1] : null;
  // Exclude known non-secret paths
  if (secret === 'index.html') return null;
  return secret;
}

async function main() {
  const secret = getSecret();
  if (!secret) {
    document.getElementById('app').innerHTML =
      '<div class="error-state"><h2>Missing secret</h2><p>Navigate to <code>/your-secret</code> to get started.</p><p>Secret must be >= 32 characters long</p></div>';
    return;
  }

  if (!firebaseConfig || !firebaseConfig.apiKey) {
    document.getElementById('app').innerHTML =
      '<div class="error-state"><h2>Firebase not configured</h2><p>Edit <code>js/firebase-config.js</code> and add your Firebase project config.</p></div>';
    return;
  }

  try {
    initStore(firebaseConfig, secret);
    const dataset = await loadData();
    initUI(dataset, async (updatedDataset) => {
      try {
        await saveData(updatedDataset);
      } catch (err) {
        console.error('Failed to save:', err);
        alert('Failed to save data. Check your connection.');
      }
    });
  } catch (err) {
    console.error('Failed to initialize:', err);
    document.getElementById('app').innerHTML =
      `<div class="error-state"><h2>Failed to load</h2><p>${err.message}</p></div>`;
  }
}

main();
