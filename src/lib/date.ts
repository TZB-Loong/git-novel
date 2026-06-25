// src/lib/date.ts
export function formatDate(
  input: string | Date,
  opts: { lang?: 'zh' | 'en' } = {},
): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const lang = opts.lang ?? 'zh';
  if (lang === 'en') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

interface DatedEntry {
  id: string;
  data: { pubDate: Date };
}

export function sortByDateDesc<T extends DatedEntry>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

export function prevNextByDate<T extends DatedEntry>(
  items: T[],
  currentId: string,
): { prev: T | null; next: T | null } {
  const sorted = [...items].sort(
    (a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime(),
  );
  const idx = sorted.findIndex((i) => i.id === currentId);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}
