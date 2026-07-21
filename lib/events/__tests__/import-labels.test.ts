import { importButtonLabel, importedMessage, plural } from '../import-labels';

describe('plural', () => {
  it('singular vs plural', () => {
    expect(plural(1, 'event')).toBe('1 event');
    expect(plural(0, 'event')).toBe('0 events');
    expect(plural(3, 'task')).toBe('3 tasks');
  });
});

describe('importButtonLabel', () => {
  it('all events', () => {
    expect(importButtonLabel(4, 0)).toBe('Import 4 events');
    expect(importButtonLabel(1, 0)).toBe('Import 1 event');
  });
  it('all tasks', () => {
    expect(importButtonLabel(0, 5)).toBe('Import 5 tasks');
    expect(importButtonLabel(0, 1)).toBe('Import 1 task');
  });
  it('mixed', () => {
    expect(importButtonLabel(2, 3)).toBe('Import 2 events, 3 tasks');
  });
});

describe('importedMessage', () => {
  it('all events', () => {
    expect(importedMessage(4, 0)).toBe('4 events imported.');
  });
  it('all tasks', () => {
    expect(importedMessage(0, 1)).toBe('1 task imported.');
  });
  it('mixed', () => {
    expect(importedMessage(2, 3)).toBe('2 events and 3 tasks imported.');
  });
});
