import { describe, it, expect } from 'vitest';
import { notesSchema, generateId } from './config';

describe('notesSchema', () => {
  it('accepts note with cover', () => {
    const r = notesSchema.safeParse({
      title: 'Note',
      pubDate: new Date('2024-03-15'),
      cover: 'notes/sample.jpg',
    });
    expect(r.success).toBe(true);
  });

  it('accepts note without cover', () => {
    const r = notesSchema.safeParse({
      title: 'Note',
      pubDate: new Date('2024-03-15'),
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing title', () => {
    const r = notesSchema.safeParse({ pubDate: new Date('2024-03-15') });
    expect(r.success).toBe(false);
  });
});

describe('generateId', () => {
  it('converts entry name to a URL-safe slug', () => {
    expect(generateId({ entry: 'hello.md' })).toBe('hello');
  });

  it('strips .mdx extension', () => {
    expect(generateId({ entry: 'my-post.mdx' })).toBe('my-post');
  });

  it('converts Chinese filenames to pinyin slug', () => {
    expect(generateId({ entry: '你好.md' })).toBe('ni-hao');
  });
});
