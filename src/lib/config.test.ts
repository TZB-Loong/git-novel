// src/lib/config.test.ts
import { describe, it, expect } from 'vitest';
import { SITE_CONFIG, isGiscusConfigured } from './config';

describe('SITE_CONFIG', () => {
  it('exposes site and base matching astro.config.ts', () => {
    expect(SITE_CONFIG.site).toBe('https://TZB-Loong.github.io');
    expect(SITE_CONFIG.base).toBe('/git-novel');
  });

  it('exposes title, description, author strings', () => {
    expect(typeof SITE_CONFIG.title).toBe('string');
    expect(SITE_CONFIG.title.length).toBeGreaterThan(0);
    expect(typeof SITE_CONFIG.description).toBe('string');
    expect(typeof SITE_CONFIG.author).toBe('string');
  });

  it('giscus uses pathname mapping', () => {
    if (SITE_CONFIG.giscus) {
      expect(SITE_CONFIG.giscus.mapping).toBe('pathname');
    }
  });
});

describe('isGiscusConfigured', () => {
  it('returns false when giscus is null', () => {
    expect(isGiscusConfigured(null)).toBe(false);
  });

  it('returns false when any required field is empty', () => {
    expect(isGiscusConfigured({
      repo: '', repoId: 'id', category: 'Announcements',
      categoryId: 'cid', mapping: 'pathname', theme: 'light',
    })).toBe(false);
  });

  it('returns true when all required fields are non-empty', () => {
    expect(isGiscusConfigured({
      repo: 'user/git-novel', repoId: 'id', category: 'Announcements',
      categoryId: 'cid', mapping: 'pathname', theme: 'light',
    })).toBe(true);
  });
});
