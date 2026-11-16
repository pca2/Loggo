import {
  addCategory,
  renameCategory,
  deleteCategory,
  addAction,
  renameAction,
  deleteAction,
  moveAction,
  addDate,
  editDate,
  deleteDate,
  getActionsByCategory,
  getLastDoneDate,
  getSortedCategories,
  exportData,
  importData,
} from './data.js';

let dataset = null;
let onSave = null;
let currentView = 'categories';
let currentCategoryId = null;
let currentActionId = null;

export function init(initialDataset, saveFn) {
  dataset = initialDataset;
  onSave = saveFn;
  currentView = 'categories';
  currentCategoryId = null;
  currentActionId = null;
  renderCurrentView();
}

function persist() {
  if (onSave) onSave(dataset);
}

function $(id) {
  return document.getElementById(id);
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today - date;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function todayStr() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function renderCurrentView() {
  if (currentView === 'categories') renderCategories();
  else if (currentView === 'actions') renderActions();
  else if (currentView === 'dates') renderDates();
}

function renderCategories() {
  currentView = 'categories';
  currentCategoryId = null;
  currentActionId = null;
  const app = $('app');
  const sorted = getSortedCategories(dataset);

  let html = `<header>
    <h1>Loggo</h1>
    <div class="header-actions">
      <button class="btn-icon" id="btn-export" title="Export data">🔽</button>
      <label class="btn-icon" title="Import data">🔼<input type="file" id="file-import" accept=".json" hidden></label>
    </div>
  </header>`;

  html += '<div class="list">';
  if (sorted.length === 0) {
    html += '<p class="empty-state">No categories yet. Add one below.</p>';
  }
  for (const cat of sorted) {
    const lastAction = getActionsByCategory(dataset, cat.id)
      .map((a) => ({ name: a.name, last: a.dates[0] || null }))
      .filter((a) => a.last)
      .sort((a, b) => (a.last > b.last ? -1 : 1))[0];
    const subtitle = lastAction
      ? `${cat.actionCount} action${cat.actionCount !== 1 ? 's' : ''} · Last: ${lastAction.name} ${formatRelativeDate(lastAction.last)}`
      : `${cat.actionCount} action${cat.actionCount !== 1 ? 's' : ''}`;

    html += `<div class="list-item" data-id="${cat.id}">
      <div class="list-item-content" data-navigate="${cat.id}">
        <div class="list-item-title">${escapeHtml(cat.name)}</div>
        <div class="list-item-subtitle">${subtitle}</div>
      </div>
      <div class="rename-form" data-rename-form="${cat.id}" hidden>
        <input type="text" data-rename-input="${cat.id}" value="${escapeHtml(cat.name)}" autocomplete="off">
        <button class="btn-sm btn-primary" data-rename-save="${cat.id}">Save</button>
        <button class="btn-sm" data-rename-cancel="${cat.id}">Cancel</button>
      </div>
      <div class="list-item-actions" data-cat-actions="${cat.id}">
        <button class="btn-sm" data-rename="${cat.id}">Rename</button>
        <button class="btn-sm btn-danger" data-delete="${cat.id}">Delete</button>
      </div>
    </div>`;
  }
  html += '</div>';
  html += `<div class="add-bar">
    <input type="text" id="input-new-category" placeholder="New category name" autocomplete="off">
    <button class="btn-primary" id="btn-add-category">Add</button>
  </div>`;

  app.innerHTML = html;
  bindCategoryEvents();
}

function bindCategoryEvents() {
  $('btn-add-category').addEventListener('click', () => {
    const input = $('input-new-category');
    const name = input.value.trim();
    if (!name) return;
    const result = addCategory(dataset, name);
    dataset = result.dataset;
    persist();
    renderCategories();
  });

  $('input-new-category').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-add-category').click();
  });

  document.querySelectorAll('[data-navigate]').forEach((el) => {
    el.addEventListener('click', () => {
      currentCategoryId = el.dataset.navigate;
      renderActions();
    });
  });

  document.querySelectorAll('[data-rename]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.rename;
      const nav = document.querySelector(`[data-navigate="${id}"]`);
      const form = document.querySelector(`[data-rename-form="${id}"]`);
      const actions = document.querySelector(`[data-cat-actions="${id}"]`);
      nav.hidden = true;
      actions.hidden = true;
      form.hidden = false;
      const input = document.querySelector(`[data-rename-input="${id}"]`);
      input.focus();
      input.select();
    });
  });

  document.querySelectorAll('[data-rename-save]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.renameSave;
      const input = document.querySelector(`[data-rename-input="${id}"]`);
      const name = input.value.trim();
      if (!name) return;
      dataset = renameCategory(dataset, id, name);
      persist();
      renderCategories();
    });
  });

  document.querySelectorAll('[data-rename-input]').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const id = el.dataset.renameInput;
        document.querySelector(`[data-rename-save="${id}"]`).click();
      } else if (e.key === 'Escape') {
        const id = el.dataset.renameInput;
        document.querySelector(`[data-rename-cancel="${id}"]`).click();
      }
    });
  });

  document.querySelectorAll('[data-rename-cancel]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.renameCancel;
      const nav = document.querySelector(`[data-navigate="${id}"]`);
      const form = document.querySelector(`[data-rename-form="${id}"]`);
      const actions = document.querySelector(`[data-cat-actions="${id}"]`);
      nav.hidden = false;
      actions.hidden = false;
      form.hidden = true;
    });
  });

  document.querySelectorAll('[data-delete]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.delete;
      const name = dataset.categories[id].name;
      if (confirm(`Delete "${name}" and all its actions?`)) {
        dataset = deleteCategory(dataset, id);
        persist();
        renderCategories();
      }
    });
  });

  $('btn-export').addEventListener('click', () => {
    const data = exportData(dataset);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loggo-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $('file-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      dataset = importData(raw);
      persist();
      renderCategories();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  });
}

function renderActions() {
  currentView = 'actions';
  currentActionId = null;
  const app = $('app');
  const catName = dataset.categories[currentCategoryId].name;
  const actions = getActionsByCategory(dataset, currentCategoryId);

  actions.sort((a, b) => {
    const aLast = a.dates[0] || '';
    const bLast = b.dates[0] || '';
    if (aLast && bLast) return aLast > bLast ? -1 : 1;
    if (aLast) return -1;
    if (bLast) return 1;
    return 0;
  });

  let html = `<header>
    <button class="btn-back" id="btn-back">&larr;</button>
    <h1>${escapeHtml(catName)}</h1>
    <button class="btn-icon" id="btn-home" title="Home">🏠</button>
  </header>`;

  html += '<div class="list">';
  if (actions.length === 0) {
    html += '<p class="empty-state">No actions yet. Add one below.</p>';
  }
  for (const act of actions) {
    const lastDate = getLastDoneDate(dataset, act.id);
    const relative = formatRelativeDate(lastDate);
    html += `<div class="list-item" data-id="${act.id}">
      <div class="list-item-content" data-navigate="${act.id}">
        <div class="list-item-title">${escapeHtml(act.name)}</div>
        <div class="list-item-subtitle">${relative}${lastDate ? ' (' + lastDate + ')' : ''} · ${act.dates.length} entries</div>
      </div>
      <div class="rename-form" data-rename-form="${act.id}" hidden>
        <input type="text" data-rename-input="${act.id}" value="${escapeHtml(act.name)}" autocomplete="off">
        <button class="btn-sm btn-primary" data-rename-save="${act.id}">Save</button>
        <button class="btn-sm" data-rename-cancel="${act.id}">Cancel</button>
      </div>
      <div class="list-item-actions" data-act-actions="${act.id}">
        <button class="btn-sm btn-primary" data-did="${act.id}">Did it!</button>
        <button class="btn-sm" data-rename="${act.id}">Rename</button>
        <button class="btn-sm" data-move="${act.id}">Move</button>
        <button class="btn-sm btn-danger" data-delete="${act.id}">Delete</button>
      </div>
    </div>`;
  }
  html += '</div>';
  html += `<div class="add-bar">
    <input type="text" id="input-new-action" placeholder="New action name" autocomplete="off">
    <button class="btn-primary" id="btn-add-action">Add</button>
  </div>`;

  app.innerHTML = html;
  bindActionEvents();
}

function bindActionEvents() {
  $('btn-back').addEventListener('click', renderCategories);
  $('btn-home').addEventListener('click', renderCategories);

  $('btn-add-action').addEventListener('click', () => {
    const input = $('input-new-action');
    const name = input.value.trim();
    if (!name) return;
    const result = addAction(dataset, currentCategoryId, name);
    dataset = result.dataset;
    persist();
    renderActions();
  });

  $('input-new-action').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-add-action').click();
  });

  document.querySelectorAll('[data-navigate]').forEach((el) => {
    el.addEventListener('click', () => {
      currentActionId = el.dataset.navigate;
      renderDates();
    });
  });

  document.querySelectorAll('[data-did]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      dataset = addDate(dataset, el.dataset.did, todayStr());
      persist();
      renderActions();
    });
  });

  document.querySelectorAll('[data-rename]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.rename;
      const nav = document.querySelector(`[data-navigate="${id}"]`);
      const form = document.querySelector(`[data-rename-form="${id}"]`);
      const actions = document.querySelector(`[data-act-actions="${id}"]`);
      nav.hidden = true;
      actions.hidden = true;
      form.hidden = false;
      const input = document.querySelector(`[data-rename-input="${id}"]`);
      input.focus();
      input.select();
    });
  });

  document.querySelectorAll('[data-rename-save]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.renameSave;
      const input = document.querySelector(`[data-rename-input="${id}"]`);
      const name = input.value.trim();
      if (!name) return;
      dataset = renameAction(dataset, id, name);
      persist();
      renderActions();
    });
  });

  document.querySelectorAll('[data-rename-input]').forEach((el) => {
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const id = el.dataset.renameInput;
        document.querySelector(`[data-rename-save="${id}"]`).click();
      } else if (e.key === 'Escape') {
        const id = el.dataset.renameInput;
        document.querySelector(`[data-rename-cancel="${id}"]`).click();
      }
    });
  });

  document.querySelectorAll('[data-rename-cancel]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.renameCancel;
      const nav = document.querySelector(`[data-navigate="${id}"]`);
      const form = document.querySelector(`[data-rename-form="${id}"]`);
      const actions = document.querySelector(`[data-act-actions="${id}"]`);
      nav.hidden = false;
      actions.hidden = false;
      form.hidden = true;
    });
  });

  document.querySelectorAll('[data-move]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.move;
      const otherCats = Object.entries(dataset.categories)
        .filter(([catId]) => catId !== currentCategoryId)
        .map(([catId, cat]) => ({ id: catId, name: cat.name }));

      if (otherCats.length === 0) {
        alert('No other categories to move to.');
        return;
      }

      const choices = otherCats.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
      const choice = prompt(`Move to which category?\n${choices}`);
      if (!choice) return;
      const idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < otherCats.length) {
        dataset = moveAction(dataset, id, otherCats[idx].id);
        persist();
        renderActions();
      }
    });
  });

  document.querySelectorAll('[data-delete]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.delete;
      const name = dataset.actions[id].name;
      if (confirm(`Delete "${name}"?`)) {
        dataset = deleteAction(dataset, id);
        persist();
        renderActions();
      }
    });
  });
}

function renderDates() {
  currentView = 'dates';
  const app = $('app');
  const action = dataset.actions[currentActionId];
  const catName = dataset.categories[action.categoryId].name;

  let html = `<header>
    <button class="btn-back" id="btn-back">&larr;</button>
    <h1>${escapeHtml(action.name)}</h1>
    <button class="btn-icon" id="btn-home" title="Home">🏠</button>
    <div class="header-subtitle">${escapeHtml(catName)}</div>
  </header>`;

  html += `<div class="add-bar">
    <input type="date" id="input-new-date" value="${todayStr()}">
    <button class="btn-primary" id="btn-add-date">Add Date</button>
  </div>`;

  html += '<div class="list">';
  if (action.dates.length === 0) {
    html += '<p class="empty-state">No dates recorded yet.</p>';
  }
  for (let i = 0; i < action.dates.length; i++) {
    const d = action.dates[i];
    html += `<div class="list-item" data-date-item="${i}">
      <div class="list-item-content date-display" data-idx="${i}">
        <div class="list-item-title">${d}</div>
        <div class="list-item-subtitle">${formatRelativeDate(d)}</div>
      </div>
      <div class="date-edit-form" data-edit-form="${i}" hidden>
        <input type="date" data-edit-input="${i}" value="${d}">
        <button class="btn-sm btn-primary" data-edit-save="${i}">Save</button>
        <button class="btn-sm" data-edit-cancel="${i}">Cancel</button>
      </div>
      <div class="list-item-actions" data-actions="${i}">
        <button class="btn-sm" data-edit="${i}">Edit</button>
        <button class="btn-sm btn-danger" data-delete="${i}">Delete</button>
      </div>
    </div>`;
  }
  html += '</div>';

  app.innerHTML = html;
  bindDateEvents();
}

function bindDateEvents() {
  $('btn-back').addEventListener('click', renderActions);
  $('btn-home').addEventListener('click', renderCategories);

  $('btn-add-date').addEventListener('click', () => {
    const input = $('input-new-date');
    const dateStr = input.value;
    if (!dateStr) return;
    try {
      dataset = addDate(dataset, currentActionId, dateStr);
      persist();
      renderDates();
    } catch (err) {
      alert(err.message);
    }
  });

  document.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = el.dataset.edit;
      const display = document.querySelector(`[data-idx="${idx}"]`);
      const form = document.querySelector(`[data-edit-form="${idx}"]`);
      const actions = document.querySelector(`[data-actions="${idx}"]`);
      display.hidden = true;
      actions.hidden = true;
      form.hidden = false;
    });
  });

  document.querySelectorAll('[data-edit-save]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.editSave, 10);
      const input = document.querySelector(`[data-edit-input="${idx}"]`);
      const newDate = input.value;
      if (!newDate) return;
      try {
        dataset = editDate(dataset, currentActionId, idx, newDate);
        persist();
        renderDates();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  document.querySelectorAll('[data-edit-cancel]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = el.dataset.editCancel;
      const display = document.querySelector(`[data-idx="${idx}"]`);
      const form = document.querySelector(`[data-edit-form="${idx}"]`);
      const actions = document.querySelector(`[data-actions="${idx}"]`);
      display.hidden = false;
      actions.hidden = false;
      form.hidden = true;
    });
  });

  document.querySelectorAll('[data-delete]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.delete, 10);
      const dateStr = dataset.actions[currentActionId].dates[idx];
      if (confirm(`Delete entry ${dateStr}?`)) {
        dataset = deleteDate(dataset, currentActionId, idx);
        persist();
        renderDates();
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
