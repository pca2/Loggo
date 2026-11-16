import { describe, test, expect, beforeEach } from 'vitest';
import {
  createDataset,
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
  getCategoryActionCount,
  getLastDoneDate,
  getSortedCategories,
  exportData,
  importData,
} from '../js/data.js';

describe('createDataset', () => {
  test('returns empty categories and actions', () => {
    const ds = createDataset();
    expect(ds).toEqual({ categories: {}, actions: {} });
  });
});

describe('category CRUD', () => {
  test('addCategory adds a category with generated id', () => {
    const ds = createDataset();
    const { dataset, id } = addCategory(ds, 'Car');
    expect(dataset.categories[id]).toEqual({ name: 'Car' });
  });

  test('renameCategory changes category name', () => {
    const ds = createDataset();
    const { dataset, id } = addCategory(ds, 'Car');
    const updated = renameCategory(dataset, id, 'Vehicle');
    expect(updated.categories[id].name).toBe('Vehicle');
  });

  test('renameCategory throws for nonexistent id', () => {
    const ds = createDataset();
    expect(() => renameCategory(ds, 'fake', 'X')).toThrow();
  });

  test('deleteCategory removes category and its actions', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil Change');
    ds = act.dataset;
    ds = deleteCategory(ds, cat.id);
    expect(ds.categories[cat.id]).toBeUndefined();
    expect(ds.actions[act.id]).toBeUndefined();
  });

  test('deleteCategory throws for nonexistent id', () => {
    const ds = createDataset();
    expect(() => deleteCategory(ds, 'fake')).toThrow();
  });
});

describe('action CRUD', () => {
  test('addAction adds an action under a category', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil Change');
    expect(act.dataset.actions[act.id]).toEqual({
      name: 'Oil Change',
      categoryId: cat.id,
      dates: [],
    });
  });

  test('addAction throws for nonexistent category', () => {
    const ds = createDataset();
    expect(() => addAction(ds, 'fake', 'X')).toThrow();
  });

  test('renameAction changes action name', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil');
    ds = act.dataset;
    ds = renameAction(ds, act.id, 'Oil Change');
    expect(ds.actions[act.id].name).toBe('Oil Change');
  });

  test('deleteAction removes an action', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil');
    ds = act.dataset;
    ds = deleteAction(ds, act.id);
    expect(ds.actions[act.id]).toBeUndefined();
  });

  test('moveAction changes action categoryId', () => {
    let ds = createDataset();
    const cat1 = addCategory(ds, 'Car');
    ds = cat1.dataset;
    const cat2 = addCategory(ds, 'Lawn');
    ds = cat2.dataset;
    const act = addAction(ds, cat1.id, 'Mow');
    ds = act.dataset;
    ds = moveAction(ds, act.id, cat2.id);
    expect(ds.actions[act.id].categoryId).toBe(cat2.id);
  });

  test('moveAction throws for nonexistent target category', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil');
    ds = act.dataset;
    expect(() => moveAction(ds, act.id, 'fake')).toThrow();
  });
});

describe('date operations', () => {
  let ds, catId, actId;

  beforeEach(() => {
    ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    catId = cat.id;
    const act = addAction(ds, catId, 'Oil');
    ds = act.dataset;
    actId = act.id;
  });

  test('addDate appends a date and sorts descending', () => {
    ds = addDate(ds, actId, '2024-01-01');
    ds = addDate(ds, actId, '2025-06-15');
    ds = addDate(ds, actId, '2024-06-15');
    expect(ds.actions[actId].dates).toEqual([
      '2025-06-15',
      '2024-06-15',
      '2024-01-01',
    ]);
  });

  test('addDate throws for invalid date format', () => {
    expect(() => addDate(ds, actId, 'not-a-date')).toThrow();
    expect(() => addDate(ds, actId, '2024/01/01')).toThrow();
  });

  test('addDate throws for nonexistent action', () => {
    expect(() => addDate(ds, 'fake', '2024-01-01')).toThrow();
  });

  test('editDate replaces a date at index', () => {
    ds = addDate(ds, actId, '2024-01-01');
    ds = addDate(ds, actId, '2024-06-15');
    ds = editDate(ds, actId, 0, '2025-12-25');
    expect(ds.actions[actId].dates).toEqual(['2025-12-25', '2024-01-01']);
  });

  test('editDate throws for out of range index', () => {
    ds = addDate(ds, actId, '2024-01-01');
    expect(() => editDate(ds, actId, 5, '2025-01-01')).toThrow();
  });

  test('deleteDate removes a date at index', () => {
    ds = addDate(ds, actId, '2024-01-01');
    ds = addDate(ds, actId, '2024-06-15');
    ds = deleteDate(ds, actId, 0);
    expect(ds.actions[actId].dates).toEqual(['2024-01-01']);
  });

  test('deleteDate throws for out of range index', () => {
    ds = addDate(ds, actId, '2024-01-01');
    expect(() => deleteDate(ds, actId, 5)).toThrow();
  });
});

describe('query helpers', () => {
  let ds, catId1, catId2, actId1, actId2, actId3;

  beforeEach(() => {
    ds = createDataset();
    const cat1 = addCategory(ds, 'Car');
    ds = cat1.dataset;
    catId1 = cat1.id;
    const cat2 = addCategory(ds, 'Lawn');
    ds = cat2.dataset;
    catId2 = cat2.id;

    const a1 = addAction(ds, catId1, 'Oil Change');
    ds = a1.dataset;
    actId1 = a1.id;
    const a2 = addAction(ds, catId1, 'Wash');
    ds = a2.dataset;
    actId2 = a2.id;
    const a3 = addAction(ds, catId2, 'Mow');
    ds = a3.dataset;
    actId3 = a3.id;

    ds = addDate(ds, actId1, '2024-01-01');
    ds = addDate(ds, actId1, '2025-06-15');
    ds = addDate(ds, actId2, '2025-11-01');
    ds = addDate(ds, actId3, '2024-07-04');
  });

  test('getActionsByCategory returns actions for a category', () => {
    const actions = getActionsByCategory(ds, catId1);
    expect(actions).toHaveLength(2);
    expect(actions.map((a) => a.name).sort()).toEqual(['Oil Change', 'Wash']);
  });

  test('getCategoryActionCount returns correct count', () => {
    expect(getCategoryActionCount(ds, catId1)).toBe(2);
    expect(getCategoryActionCount(ds, catId2)).toBe(1);
  });

  test('getLastDoneDate returns most recent date', () => {
    expect(getLastDoneDate(ds, actId1)).toBe('2025-06-15');
    expect(getLastDoneDate(ds, actId3)).toBe('2024-07-04');
  });

  test('getLastDoneDate returns null for action with no dates', () => {
    const act = addAction(ds, catId1, 'Empty');
    ds = act.dataset;
    expect(getLastDoneDate(ds, act.id)).toBeNull();
  });

  test('getSortedCategories sorts by most recently done action', () => {
    const sorted = getSortedCategories(ds);
    expect(sorted[0].name).toBe('Car');
    expect(sorted[1].name).toBe('Lawn');
  });

  test('getSortedCategories puts categories with no actions last', () => {
    const cat3 = addCategory(ds, 'Empty');
    ds = cat3.dataset;
    const sorted = getSortedCategories(ds);
    expect(sorted[sorted.length - 1].name).toBe('Empty');
  });
});

describe('export / import', () => {
  test('exportData returns a JSON-serializable copy', () => {
    let ds = createDataset();
    const cat = addCategory(ds, 'Car');
    ds = cat.dataset;
    const act = addAction(ds, cat.id, 'Oil');
    ds = act.dataset;
    ds = addDate(ds, act.id, '2024-01-01');

    const exported = exportData(ds);
    const parsed = JSON.parse(JSON.stringify(exported));
    expect(parsed).toEqual(ds);
  });

  test('importData validates and returns dataset', () => {
    const raw = {
      categories: { c1: { name: 'Car' } },
      actions: {
        a1: { name: 'Oil', categoryId: 'c1', dates: ['2024-01-01'] },
      },
    };
    const ds = importData(raw);
    expect(ds.categories.c1.name).toBe('Car');
    expect(ds.actions.a1.dates).toEqual(['2024-01-01']);
  });

  test('importData throws for invalid structure', () => {
    expect(() => importData(null)).toThrow();
    expect(() => importData({})).toThrow();
    expect(() => importData({ categories: {} })).toThrow();
  });

  test('importData throws for action referencing nonexistent category', () => {
    const raw = {
      categories: {},
      actions: {
        a1: { name: 'Oil', categoryId: 'missing', dates: [] },
      },
    };
    expect(() => importData(raw)).toThrow();
  });

  test('importData throws for action with invalid dates', () => {
    const raw = {
      categories: { c1: { name: 'Car' } },
      actions: {
        a1: { name: 'Oil', categoryId: 'c1', dates: ['bad-date'] },
      },
    };
    expect(() => importData(raw)).toThrow();
  });
});
