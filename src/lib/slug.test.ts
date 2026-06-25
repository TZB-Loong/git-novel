import { describe, it, expect } from 'vitest';
import { toSlug, assertUniqueSlugs } from './slug';

describe('toSlug', () => {
  it('converts ASCII filename to lowercase kebab', () => {
    expect(toSlug('Hello-World.md')).toBe('hello-world');
  });

  it('converts Chinese filename to pinyin', () => {
    // pinyin without tones, joined by '-'
    const slug = toSlug('我的第一篇文章.md');
    expect(slug).toMatch(/^[a-z-]+$/);
    expect(slug).toContain('wo');
    expect(slug).not.toContain('的');
  });

  it('replaces spaces and underscores with hyphens', () => {
    expect(toSlug('hello world_post.md')).toBe('hello-world-post');
  });

  it('collapses consecutive hyphens', () => {
    expect(toSlug('a--b.md')).toBe('a-b');
  });

  it('trims leading/trailing hyphens', () => {
    expect(toSlug('--hello--.md')).toBe('hello');
  });

  it('strips extension when full filename passed', () => {
    expect(toSlug('hello.md')).toBe('hello');
    expect(toSlug('hello.mdx')).toBe('hello');
  });

  it('handles mixed Chinese and ASCII', () => {
    const slug = toSlug('笔记-2024-note.md');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toContain('note');
  });

  it('falls back to hash for fully non-ASCII non-Chinese input', () => {
    // e.g. emoji-only filename — must still produce a non-empty slug
    const slug = toSlug('🌟.md');
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('assertUniqueSlugs', () => {
  it('passes when all slugs unique', () => {
    expect(() =>
      assertUniqueSlugs([
        { slug: 'a', file: 'a.md' },
        { slug: 'b', file: 'b.md' },
      ]),
    ).not.toThrow();
  });

  it('throws listing all conflicting files on duplicate', () => {
    expect(() =>
      assertUniqueSlugs([
        { slug: 'dup', file: 'a.md' },
        { slug: 'dup', file: 'b.md' },
      ]),
    ).toThrowError(/a\.md.*b\.md|b\.md.*a\.md/);
  });
});
