import { describe, it, expect } from 'vitest';
import {
  articlesSchema,
  notesSchema,
  albumsSchema,
  generateId,
} from './config';

describe('articlesSchema', () => {
  it('accepts valid frontmatter with all fields', () => {
    const r = articlesSchema.safeParse({
      title: 'Hello',
      pubDate: new Date('2024-03-15'),
      description: 'desc',
      tags: ['a'],
      category: 'tech',
      draft: false,
    });
    expect(r.success).toBe(true);
  });

  it('accepts minimal required-only frontmatter', () => {
    const r = articlesSchema.safeParse({
      title: 'Hello',
      pubDate: new Date('2024-03-15'),
      description: 'desc',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing title', () => {
    const r = articlesSchema.safeParse({
      pubDate: new Date('2024-03-15'),
      description: 'desc',
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing pubDate', () => {
    const r = articlesSchema.safeParse({
      title: 'Hello',
      description: 'desc',
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing description', () => {
    const r = articlesSchema.safeParse({
      title: 'Hello',
      pubDate: new Date('2024-03-15'),
    });
    expect(r.success).toBe(false);
  });

  it('defaults draft to false when omitted', () => {
    const r = articlesSchema.safeParse({
      title: 'Hello',
      pubDate: new Date('2024-03-15'),
      description: 'desc',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.draft).toBe(false);
  });
});

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

describe('albumsSchema', () => {
  it('accepts album with images', () => {
    const r = albumsSchema.safeParse({
      title: 'Demo',
      date: new Date('2024-03-15'),
      images: ['1.jpg', '2.jpg'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty images array', () => {
    const r = albumsSchema.safeParse({
      title: 'Demo',
      date: new Date('2024-03-15'),
      images: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing images', () => {
    const r = albumsSchema.safeParse({
      title: 'Demo',
      date: new Date('2024-03-15'),
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing date', () => {
    const r = albumsSchema.safeParse({
      title: 'Demo',
      images: ['1.jpg'],
    });
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
