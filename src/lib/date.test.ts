// src/lib/date.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, sortByDateDesc, prevNextByDate } from './date';

describe('formatDate', () => {
  it('formats ISO date in Chinese by default', () => {
    expect(formatDate('2024-03-15')).toBe('2024年3月15日');
  });

  it('formats in English when lang=en', () => {
    expect(formatDate('2024-03-15', { lang: 'en' })).toBe('March 15, 2024');
  });

  it('accepts Date object input', () => {
    expect(formatDate(new Date('2024-03-15'))).toBe('2024年3月15日');
  });

  it('handles ISO datetime with timezone', () => {
    expect(formatDate('2024-03-15T10:30:00Z')).toBe('2024年3月15日');
  });
});

describe('sortByDateDesc', () => {
  const items = [
    { id: 'a', data: { pubDate: new Date('2024-01-01') } },
    { id: 'b', data: { pubDate: new Date('2024-03-01') } },
    { id: 'c', data: { pubDate: new Date('2024-02-01') } },
  ];

  it('sorts newest first', () => {
    const sorted = sortByDateDesc(items);
    expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    sortByDateDesc(items);
    expect(items.map((i) => i.id)).toEqual(copy.map((i) => i.id));
  });
});

describe('prevNextByDate', () => {
  const items = [
    { id: 'a', data: { pubDate: new Date('2024-01-01') } },
    { id: 'b', data: { pubDate: new Date('2024-03-01') } },
    { id: 'c', data: { pubDate: new Date('2024-02-01') } },
  ];

  it('returns prev (older) and next (newer) for middle item', () => {
    const { prev, next } = prevNextByDate(items, 'c');
    expect(prev?.id).toBe('a');
    expect(next?.id).toBe('b');
  });

  it('returns null prev for oldest item', () => {
    const { prev, next } = prevNextByDate(items, 'a');
    expect(prev).toBeNull();
    expect(next?.id).toBe('c');
  });

  it('returns null next for newest item', () => {
    const { prev, next } = prevNextByDate(items, 'b');
    expect(prev?.id).toBe('c');
    expect(next).toBeNull();
  });
});
