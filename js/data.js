function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDate(dateStr) {
  if (!DATE_RE.test(dateStr)) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
}

function sortDatesDesc(dates) {
  return [...dates].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function createDataset() {
  return { categories: {}, actions: {} };
}

export function addCategory(dataset, name) {
  const ds = deepClone(dataset);
  const id = generateId();
  ds.categories[id] = { name };
  return { dataset: ds, id };
}

export function renameCategory(dataset, id, name) {
  if (!dataset.categories[id]) {
    throw new Error(`Category not found: ${id}`);
  }
  const ds = deepClone(dataset);
  ds.categories[id].name = name;
  return ds;
}

export function deleteCategory(dataset, id) {
  if (!dataset.categories[id]) {
    throw new Error(`Category not found: ${id}`);
  }
  const ds = deepClone(dataset);
  delete ds.categories[id];
  for (const [actId, action] of Object.entries(ds.actions)) {
    if (action.categoryId === id) {
      delete ds.actions[actId];
    }
  }
  return ds;
}

export function addAction(dataset, categoryId, name) {
  if (!dataset.categories[categoryId]) {
    throw new Error(`Category not found: ${categoryId}`);
  }
  const ds = deepClone(dataset);
  const id = generateId();
  ds.actions[id] = { name, categoryId, dates: [] };
  return { dataset: ds, id };
}

export function renameAction(dataset, id, name) {
  if (!dataset.actions[id]) {
    throw new Error(`Action not found: ${id}`);
  }
  const ds = deepClone(dataset);
  ds.actions[id].name = name;
  return ds;
}

export function deleteAction(dataset, id) {
  if (!dataset.actions[id]) {
    throw new Error(`Action not found: ${id}`);
  }
  const ds = deepClone(dataset);
  delete ds.actions[id];
  return ds;
}

export function moveAction(dataset, actionId, newCategoryId) {
  if (!dataset.actions[actionId]) {
    throw new Error(`Action not found: ${actionId}`);
  }
  if (!dataset.categories[newCategoryId]) {
    throw new Error(`Category not found: ${newCategoryId}`);
  }
  const ds = deepClone(dataset);
  ds.actions[actionId].categoryId = newCategoryId;
  return ds;
}

export function addDate(dataset, actionId, dateStr) {
  if (!dataset.actions[actionId]) {
    throw new Error(`Action not found: ${actionId}`);
  }
  validateDate(dateStr);
  const ds = deepClone(dataset);
  ds.actions[actionId].dates.push(dateStr);
  ds.actions[actionId].dates = sortDatesDesc(ds.actions[actionId].dates);
  return ds;
}

export function editDate(dataset, actionId, index, newDateStr) {
  if (!dataset.actions[actionId]) {
    throw new Error(`Action not found: ${actionId}`);
  }
  if (index < 0 || index >= dataset.actions[actionId].dates.length) {
    throw new Error(`Date index out of range: ${index}`);
  }
  validateDate(newDateStr);
  const ds = deepClone(dataset);
  ds.actions[actionId].dates[index] = newDateStr;
  ds.actions[actionId].dates = sortDatesDesc(ds.actions[actionId].dates);
  return ds;
}

export function deleteDate(dataset, actionId, index) {
  if (!dataset.actions[actionId]) {
    throw new Error(`Action not found: ${actionId}`);
  }
  if (index < 0 || index >= dataset.actions[actionId].dates.length) {
    throw new Error(`Date index out of range: ${index}`);
  }
  const ds = deepClone(dataset);
  ds.actions[actionId].dates.splice(index, 1);
  return ds;
}

export function getActionsByCategory(dataset, categoryId) {
  return Object.entries(dataset.actions)
    .filter(([, a]) => a.categoryId === categoryId)
    .map(([id, a]) => ({ id, ...a }));
}

export function getCategoryActionCount(dataset, categoryId) {
  return getActionsByCategory(dataset, categoryId).length;
}

export function getLastDoneDate(dataset, actionId) {
  const action = dataset.actions[actionId];
  if (!action || action.dates.length === 0) return null;
  return action.dates[0];
}

export function getSortedCategories(dataset) {
  const catEntries = Object.entries(dataset.categories).map(([id, cat]) => {
    const actions = getActionsByCategory(dataset, id);
    const lastDates = actions
      .map((a) => (a.dates.length > 0 ? a.dates[0] : null))
      .filter(Boolean);
    const mostRecent =
      lastDates.length > 0
        ? lastDates.reduce((a, b) => (a > b ? a : b))
        : null;
    return { id, name: cat.name, actionCount: actions.length, mostRecent };
  });

  return catEntries.sort((a, b) => {
    if (a.mostRecent && b.mostRecent) return a.mostRecent > b.mostRecent ? -1 : 1;
    if (a.mostRecent) return -1;
    if (b.mostRecent) return 1;
    return 0;
  });
}

export function exportData(dataset) {
  return deepClone(dataset);
}

export function importData(raw) {
  if (!raw || typeof raw !== 'object' || !raw.categories || !raw.actions) {
    throw new Error('Invalid data format: must have categories and actions');
  }

  for (const [, cat] of Object.entries(raw.categories)) {
    if (!cat.name || typeof cat.name !== 'string') {
      throw new Error('Invalid category: missing name');
    }
  }

  for (const [, action] of Object.entries(raw.actions)) {
    if (!action.name || typeof action.name !== 'string') {
      throw new Error('Invalid action: missing name');
    }
    if (!raw.categories[action.categoryId]) {
      throw new Error(
        `Action references nonexistent category: ${action.categoryId}`
      );
    }
    if (!Array.isArray(action.dates)) {
      throw new Error('Invalid action: dates must be an array');
    }
    for (const d of action.dates) {
      validateDate(d);
    }
  }

  return deepClone(raw);
}
