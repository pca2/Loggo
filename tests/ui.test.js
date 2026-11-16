/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  createDataset,
  addCategory,
  addAction,
  addDate,
} from '../js/data.js';
import { init, todayStr } from '../js/ui.js';

function setupDOM() {
  document.body.innerHTML = '<div id="app"></div>';
}

function buildTestDataset() {
  let ds = createDataset();
  const cat1 = addCategory(ds, 'Car');
  ds = cat1.dataset;
  const cat2 = addCategory(ds, 'Lawn');
  ds = cat2.dataset;
  const act1 = addAction(ds, cat1.id, 'Oil Change');
  ds = act1.dataset;
  ds = addDate(ds, act1.id, '2025-06-15');
  const act2 = addAction(ds, cat2.id, 'Mow');
  ds = act2.dataset;
  ds = addDate(ds, act2.id, '2024-07-04');
  return { ds, cat1Id: cat1.id, cat2Id: cat2.id, act1Id: act1.id, act2Id: act2.id };
}

describe('UI rendering', () => {
  beforeEach(() => {
    setupDOM();
  });

  test('renders categories view on init', () => {
    const { ds } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    const app = document.getElementById('app');
    expect(app.querySelector('h1').textContent).toBe('Loggo');
    expect(app.innerHTML).toContain('Car');
    expect(app.innerHTML).toContain('Lawn');
  });

  test('renders empty state when no categories', () => {
    const ds = createDataset();
    init(ds, vi.fn());
    const app = document.getElementById('app');
    expect(app.innerHTML).toContain('No categories yet');
  });

  test('navigating to a category shows its actions', () => {
    const { ds, cat1Id } = buildTestDataset();
    init(ds, vi.fn());
    const navEl = document.querySelector(`[data-navigate="${cat1Id}"]`);
    navEl.click();
    const app = document.getElementById('app');
    expect(app.innerHTML).toContain('Oil Change');
    expect(app.innerHTML).not.toContain('Mow');
  });

  test('navigating to an action shows its dates', () => {
    const { ds, cat1Id, act1Id } = buildTestDataset();
    init(ds, vi.fn());
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    document.querySelector(`[data-navigate="${act1Id}"]`).click();
    const app = document.getElementById('app');
    expect(app.innerHTML).toContain('2025-06-15');
  });

  test('back button from actions returns to categories', () => {
    const { ds, cat1Id } = buildTestDataset();
    init(ds, vi.fn());
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    expect(document.getElementById('app').innerHTML).toContain('Oil Change');
    document.getElementById('btn-back').click();
    expect(document.getElementById('app').querySelector('h1').textContent).toBe('Loggo');
  });

  test('adding a category calls save and re-renders', () => {
    const ds = createDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    const input = document.getElementById('input-new-category');
    input.value = 'Garden';
    document.getElementById('btn-add-category').click();
    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).toContain('Garden');
  });

  test('adding an action calls save and re-renders', () => {
    const { ds, cat1Id } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    const input = document.getElementById('input-new-action');
    input.value = 'Tire Rotation';
    document.getElementById('btn-add-action').click();
    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).toContain('Tire Rotation');
  });

  test('"Did it!" button adds today\'s date and calls save', () => {
    const { ds, cat1Id, act1Id } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    const didBtn = document.querySelector(`[data-did="${act1Id}"]`);
    didBtn.click();
    expect(saveFn).toHaveBeenCalled();
    const today = todayStr();
    expect(document.getElementById('app').innerHTML).toContain(today);
  });

  test('delete category button removes it after confirm', () => {
    const { ds, cat1Id } = buildTestDataset();
    const saveFn = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    init(ds, saveFn);
    document.querySelector(`[data-delete="${cat1Id}"]`).click();
    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).not.toContain('Car');
    window.confirm.mockRestore();
  });

  test('rename category uses inline form', () => {
    const { ds, cat1Id } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    document.querySelector(`[data-rename="${cat1Id}"]`).click();

    const form = document.querySelector(`[data-rename-form="${cat1Id}"]`);
    expect(form.hidden).toBe(false);

    const input = document.querySelector(`[data-rename-input="${cat1Id}"]`);
    expect(input.value).toBe('Car');
    input.value = 'Vehicle';
    document.querySelector(`[data-rename-save="${cat1Id}"]`).click();

    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).toContain('Vehicle');
    expect(document.getElementById('app').innerHTML).not.toContain('Car');
  });

  test('rename action uses inline form', () => {
    const { ds, cat1Id, act1Id } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    document.querySelector(`[data-rename="${act1Id}"]`).click();

    const form = document.querySelector(`[data-rename-form="${act1Id}"]`);
    expect(form.hidden).toBe(false);

    const input = document.querySelector(`[data-rename-input="${act1Id}"]`);
    expect(input.value).toBe('Oil Change');
    input.value = 'Oil & Filter Change';
    document.querySelector(`[data-rename-save="${act1Id}"]`).click();

    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).toContain('Oil &amp; Filter Change');
  });

  test('editing a date uses inline date picker, not prompt', () => {
    const { ds, cat1Id, act1Id } = buildTestDataset();
    const saveFn = vi.fn();
    init(ds, saveFn);
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    document.querySelector(`[data-navigate="${act1Id}"]`).click();

    const editBtn = document.querySelector('[data-edit="0"]');
    editBtn.click();

    const form = document.querySelector('[data-edit-form="0"]');
    expect(form.hidden).toBe(false);

    const input = document.querySelector('[data-edit-input="0"]');
    expect(input.type).toBe('date');
    expect(input.value).toBe('2025-06-15');

    input.value = '2026-01-01';
    document.querySelector('[data-edit-save="0"]').click();
    expect(saveFn).toHaveBeenCalled();
    expect(document.getElementById('app').innerHTML).toContain('2026-01-01');
  });

  test('cancelling date edit restores display', () => {
    const { ds, cat1Id, act1Id } = buildTestDataset();
    init(ds, vi.fn());
    document.querySelector(`[data-navigate="${cat1Id}"]`).click();
    document.querySelector(`[data-navigate="${act1Id}"]`).click();

    document.querySelector('[data-edit="0"]').click();
    const form = document.querySelector('[data-edit-form="0"]');
    expect(form.hidden).toBe(false);

    document.querySelector('[data-edit-cancel="0"]').click();
    expect(form.hidden).toBe(true);
    const display = document.querySelector('[data-idx="0"]');
    expect(display.hidden).toBe(false);
  });
});

describe('todayStr', () => {
  test('returns YYYY-MM-DD format', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches local date getters', () => {
    const result = todayStr();
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    expect(result).toBe(expected);
  });

  test('pads single-digit month and day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5)); // Jan 5 (month 0-indexed)
    expect(todayStr()).toBe('2026-01-05');
    vi.useRealTimers();
  });
});
