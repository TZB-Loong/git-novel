import { pinyin } from 'pinyin-pro';

/**
 * Convert a Markdown filename (with or without extension) to a URL-safe
 * ASCII slug. Chinese characters are converted to tone-less pinyin.
 * Non-ASCII non-Chinese input (e.g. emoji-only filenames) falls back to
 * a deterministic hash so the slug is never empty.
 */
export function toSlug(filename: string): string {
  const withoutExt = filename.replace(/\.(md|mdx)$/i, '');
  const pinyinStr = pinyin(withoutExt, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }).join('-');

  let slug = pinyinStr
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '') // strip remaining non-ASCII/non-word chars
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length === 0) {
    // Fully non-ASCII non-Chinese input (e.g. emoji). Derive a stable,
    // URL-safe slug from a simple hash of the original filename so the
    // slug is never empty.
    slug = hashSlug(withoutExt);
  }

  return slug;
}

/**
 * Deterministic, URL-safe slug derived from the input string. Used as a
 * fallback when pinyin conversion yields nothing.
 */
function hashSlug(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return `post-${Math.abs(hash).toString(36)}`;
}

/**
 * Throw a descriptive error listing every pair of files that produced
 * the same slug. Called at build time to fail fast on slug collisions.
 */
export function assertUniqueSlugs(
  entries: Array<{ slug: string; file: string }>,
): void {
  const groups = new Map<string, string[]>();
  for (const { slug, file } of entries) {
    const arr = groups.get(slug) ?? [];
    arr.push(file);
    groups.set(slug, arr);
  }
  const dupes = [...groups.values()].filter((arr) => arr.length > 1);
  if (dupes.length > 0) {
    const detail = dupes
      .map((files) => `slug collision: ${files.join(', ')}`)
      .join('\n');
    throw new Error(`Duplicate slugs detected:\n${detail}`);
  }
}
