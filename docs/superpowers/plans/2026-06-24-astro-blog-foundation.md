---
change: astro-blog-foundation
design-doc: docs/superpowers/specs/2026-06-24-astro-blog-foundation-design.md
base-ref: fe2e0cbe2f9b40623f6c3e24005620afb18c0ece
---

# Astro Blog Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Astro 5 blog on GitHub Pages serving Markdown articles, image-rich notes, and photo albums with Giscus comments, RSS, sitemap, and CI/CD.

**Architecture:** Static site generated at build time via Astro Content Collections. Three collections (articles/notes/albums) with zod-validated frontmatter. Images live under `src/assets/` for astro:assets optimization. base path `/git-novel` for GitHub Pages project site. Vitest covers pure utility functions; `.astro` components are exempt (verified via `npm run build`).

**Tech Stack:** Astro 5, TypeScript (strict), Content Collections, @astrojs/mdx, @astrojs/rss, @astrojs/sitemap, @astrojs/react + @giscus/react, glightbox, pinyin-pro, Vitest + @vitest/coverage-v8, Shiki (built-in), GitHub Actions (withastro/action@v3, deploy-pages@v4).

## Global Constraints

- Astro version locked to `^5` (Design Doc §9).
- `base='/git-novel'` in astro.config.ts; all internal links prefixed with `import.meta.env.BASE_URL`.
- `site` field placeholder `https://username.github.io` — user MUST replace `username` with real GitHub username before first deploy (Design Doc §11 open question).
- Frontmatter schema in `src/content/config.ts` is the stable contract for change 2 (obsidian-migration) — do NOT mutate schema without coordination (Design Doc §10).
- Images MUST live under `src/assets/` (not `public/`) for automatic WebP/AVIF optimization.
- Draft entries (`draft: true`) filtered in `import.meta.env.PROD` only; visible in dev.
- Vitest coverage glob excludes `**/*.astro`; UI correctness verified via `npm run build`.
- No service-side runtime; all pages pre-rendered to static HTML.
- `npm test -- --coverage` MUST pass before `npm run build` in CI.
- tasks.md 1.1 (git init + .gitignore) already complete — skip.

---

## File Structure

```
src/
  content/
    config.ts                    # zod schema: articles/notes/albums
    articles/hello.md            # sample article
    notes/sample.md              # sample note (with cover)
    notes/text-only.md           # sample note (no cover, excluded from card stream)
    albums/demo.md               # sample album metadata
  pages/
    index.astro                  # home: latest 5 articles + 6 note cards
    articles/index.astro         # all articles, ?tag= ?category= filter
    articles/[...slug].astro     # article detail + TOC + prev/next + Giscus
    notes/index.astro            # note card grid (cover-only)
    notes/[...slug].astro        # note detail + Giscus
    gallery/index.astro          # album index
    gallery/[album].astro        # single album grid + Lightbox
    rss.xml.ts                   # @astrojs/rss endpoint
  components/
    BaseHead.astro               # meta, SEO, OG, canonical, RSS link
    Header.astro                 # nav with current-page highlight
    Footer.astro                 # copyright + RSS + GitHub
    Lightbox.astro               # GLightbox wrapper (client:load on album pages)
    Giscus.astro                 # wraps React Giscus.tsx with client:idle
    Giscus.tsx                   # @giscus/react component
    NoteCard.astro               # cover thumb + title + date
    ArticleCard.astro            # title + date + description
    TOC.astro                    # h2/h3 from headings
  layouts/
    BaseLayout.astro             # HTML skeleton, imports BaseHead/Header/Footer
  lib/
    config.ts                    # site config (site, base, giscus)
    config.test.ts
    slug.ts                      # filename → pinyin slug
    slug.test.ts
    date.ts                      # ISO parse + format
    date.test.ts
    gallery.ts                   # album image collection + sort
    gallery.test.ts
  assets/
    gallery/demo/                # sample album images (3 placeholders)
    notes/sample-cover.jpg       # sample note cover
  styles/
    global.css                   # CSS vars, dark mode, breakpoints
public/
  favicon.svg
astro.config.ts
tsconfig.json
vitest.config.ts
.github/workflows/deploy.yml
README.md
```

---

## Task 1: Astro Project Skeleton

**Files:**
- Modify: `package.json` (add Astro deps + scripts)
- Create: `astro.config.ts`
- Create: `tsconfig.json`
- Create: `src/pages/index.astro`
- Create: `public/favicon.svg`

**Interfaces:**
- Produces: `astro.config.ts` exporting default `defineConfig({ site, base, integrations, markdown })` — consumed by all later tasks.
- Produces: npm scripts `dev`, `build`, `preview`, `test`, `test:coverage`.

- [x] **Step 1: Add dependencies to package.json**

Replace `package.json` contents with:

```json
{
  "name": "git-novel",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@astrojs/mdx": "^4.0.0",
    "@astrojs/react": "^4.0.0",
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "@fission-ai/openspec": "^1.4.1",
    "@giscus/react": "^3.0.0",
    "astro": "^5.0.0",
    "glightbox": "^3.3.0",
    "pinyin-pro": "^3.24.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitest/coverage-v8": "^2.1.0",
    "vitest": "^2.1.0"
  }
}
```

- [x] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs without errors; `node_modules/astro` exists.

- [x] **Step 3: Create astro.config.ts**

```typescript
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// TODO(user): replace `username` with real GitHub username before first deploy.
const site = 'https://username.github.io';

export default defineConfig({
  site,
  base: '/git-novel',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/draft/'),
    }),
    react(),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
```

- [x] **Step 4: Create tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "types": ["vitest/globals"]
  },
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules", "coverage"]
}
```

- [x] **Step 5: Create src/pages/index.astro placeholder**

```astro
---
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>git-novel</title>
  </head>
  <body>
    <h1>Astro blog skeleton OK</h1>
  </body>
</html>
```

- [x] **Step 6: Create public/favicon.svg**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#333"/><text x="16" y="22" font-size="18" text-anchor="middle" fill="#fff">N</text></svg>
```

- [x] **Step 7: Verify dev server boots**

Run: `npm run dev` (then Ctrl+C after seeing "ready")
Expected: server starts on http://localhost:4321/git-novel/ with no errors.

- [x] **Step 8: Verify build**

Run: `npm run build`
Expected: `dist/` generated; `dist/index.html` exists.

- [x] **Step 9: Commit**

```bash
git add package.json package-lock.json astro.config.ts tsconfig.json src/pages/index.astro public/favicon.svg
git commit -m "feat: scaffold Astro 5 project with mdx, sitemap, react integrations"
```

---

## Task 2: Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (test scripts already added in Task 1)
- Create: `src/lib/__tests__/sanity.test.ts` (throwaway sanity check)

**Interfaces:**
- Produces: `vitest.config.ts` with coverage glob excluding `**/*.astro`, `dist`, `node_modules`.
- Produces: `npm test` and `npm run test:coverage` commands.

- [x] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**/*.ts', 'src/content/config.ts'],
      exclude: ['**/*.astro', '**/*.test.ts', 'src/lib/config.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
});
```

Note: `src/lib/config.ts` excluded because it is a plain constant export (no logic to test); configuration correctness verified by build.

- [x] **Step 2: Create sanity test**

```typescript
// src/lib/__tests__/sanity.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [x] **Step 3: Run tests**

Run: `npm test`
Expected: 1 test passes.

- [x] **Step 4: Run coverage (will warn — no real lib files yet)**

Run: `npm run test:coverage`
Expected: completes; coverage report shows 0% for lib (acceptable for now — real targets come in Tasks 3-7).

- [x] **Step 5: Commit**

```bash
git add vitest.config.ts src/lib/__tests__/sanity.test.ts
git commit -m "test: configure Vitest with v8 coverage, exclude .astro components"
```

---

## Task 3: Site Config Module (TDD)

**Files:**
- Create: `src/lib/config.ts`
- Create: `src/lib/config.test.ts`
- Delete: `src/lib/__tests__/sanity.test.ts` (superseded)

**Interfaces:**
- Produces: `SITE_CONFIG` object with shape:
  ```typescript
  {
    site: string;          // 'https://username.github.io'
    base: string;          // '/git-novel'
    title: string;
    description: string;
    author: string;
    giscus: {
      repo: string;        // 'username/git-novel' or '' if unconfigured
      repoId: string;
      category: string;
      categoryId: string;
      mapping: 'pathname';
      theme: string;       // 'light' | 'dark' | 'transparent_dark'
    } | null;              // null when any required field empty
  }
  ```
- Consumed by: Task 19 (Giscus), Task 8 (BaseHead for title/description), Task 20 (RSS).

- [x] **Step 1: Write failing test**

```typescript
// src/lib/config.test.ts
import { describe, it, expect } from 'vitest';
import { SITE_CONFIG, isGiscusConfigured } from './config';

describe('SITE_CONFIG', () => {
  it('exposes site and base matching astro.config.ts', () => {
    expect(SITE_CONFIG.site).toBe('https://username.github.io');
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/config.test.ts`
Expected: FAIL with "Cannot find module './config'".

- [x] **Step 3: Implement config.ts**

```typescript
// src/lib/config.ts
export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname';
  theme: 'light' | 'dark' | 'transparent_dark';
}

export interface SiteConfig {
  site: string;
  base: string;
  title: string;
  description: string;
  author: string;
  giscus: GiscusConfig | null;
}

// Placeholder Giscus values — user fills after running giscus.app wizard.
// When any required field is empty, giscus is null so build does not break.
const rawGiscus = {
  repo: '',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  mapping: 'pathname' as const,
  theme: 'light' as const,
};

export const SITE_CONFIG: SiteConfig = {
  site: 'https://username.github.io',
  base: '/git-novel',
  title: 'git-novel',
  description: '个人博客 — 文章、笔记、相册',
  author: 'loong',
  giscus:
    rawGiscus.repo && rawGiscus.repoId && rawGiscus.categoryId
      ? rawGiscus
      : null,
};

export function isGiscusConfigured(g: GiscusConfig | null): boolean {
  if (!g) return false;
  return Boolean(g.repo && g.repoId && g.category && g.categoryId);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/config.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Remove sanity test**

Run: `rm src/lib/__tests__/sanity.test.ts && rmdir src/lib/__tests__`

- [x] **Step 6: Commit**

```bash
git add src/lib/config.ts src/lib/config.test.ts
git rm src/lib/__tests__/sanity.test.ts
git commit -m "feat(lib): add SITE_CONFIG with optional Giscus section"
```

---

## Task 4: Slug Utility (TDD)

**Files:**
- Create: `src/lib/slug.ts`
- Create: `src/lib/slug.test.ts`

**Interfaces:**
- Produces: `toSlug(filename: string): string` — converts Markdown filename (without extension) to URL-safe ASCII slug.
- Produces: `assertUniqueSlugs(slugs: Array<{ slug: string; file: string }>): void` — throws listing conflicting files on duplicate.
- Consumed by: content collection slug customization (Task 6, via `slug` field in collection config).

- [x] **Step 1: Write failing test**

```typescript
// src/lib/slug.test.ts
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/slug.test.ts`
Expected: FAIL with "Cannot find module './slug'".

- [x] **Step 3: Implement slug.ts**

```typescript
// src/lib/slug.ts
import { pinyin } from 'pinyin-pro';

/**
 * Convert a Markdown filename (with or without extension) to a URL-safe
 * ASCII slug. Chinese characters are converted to tone-less pinyin.
 */
export function toSlug(filename: string): string {
  const withoutExt = filename.replace(/\.(md|mdx)$/i, '');
  const pinyinStr = pinyin(withoutExt, {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }).join('-');

  return pinyinStr
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]+/g, '') // strip remaining non-ASCII/non-word chars
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
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
```

Note: if `pinyin-pro` API differs in installed version, the implementer adjusts the options object to satisfy the test expectations. The test is the source of truth.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/slug.test.ts`
Expected: PASS (10 tests).

If pinyin output doesn't match assertions, check `pinyin-pro` README via `node -e "const {pinyin}=require('pinyin-pro'); console.log(pinyin('我的第一篇文章',{toneType:'none',type:'array'}))"` and adjust options until test passes.

- [x] **Step 5: Commit**

```bash
git add src/lib/slug.ts src/lib/slug.test.ts
git commit -m "feat(lib): add toSlug with Chinese-to-pinyin conversion and uniqueness check"
```

---

## Task 5: Date Utility (TDD)

**Files:**
- Create: `src/lib/date.ts`
- Create: `src/lib/date.test.ts`

**Interfaces:**
- Produces: `formatDate(input: string | Date, opts?: { lang?: 'zh' | 'en' }): string`
- Produces: `sortByDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[]`
- Produces: `prevNextByDate<T extends { data: { pubDate: Date } }>(items: T[], currentSlug: string): { prev: T | null; next: T | null }`
- Consumed by: Task 11 (article detail prev/next), Task 13 (article list sort), Task 14 (notes sort), Task 15 (home latest), Task 20 (RSS sort).

- [x] **Step 1: Write failing test**

```typescript
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
    { slug: 'a', data: { pubDate: new Date('2024-01-01') } },
    { slug: 'b', data: { pubDate: new Date('2024-03-01') } },
    { slug: 'c', data: { pubDate: new Date('2024-02-01') } },
  ];

  it('sorts newest first', () => {
    const sorted = sortByDateDesc(items);
    expect(sorted.map((i) => i.slug)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const copy = [...items];
    sortByDateDesc(items);
    expect(items.map((i) => i.slug)).toEqual(copy.map((i) => i.slug));
  });
});

describe('prevNextByDate', () => {
  const items = [
    { slug: 'a', data: { pubDate: new Date('2024-01-01') } },
    { slug: 'b', data: { pubDate: new Date('2024-03-01') } },
    { slug: 'c', data: { pubDate: new Date('2024-02-01') } },
  ];

  it('returns prev (older) and next (newer) for middle item', () => {
    const { prev, next } = prevNextByDate(items, 'c');
    expect(prev?.slug).toBe('a');
    expect(next?.slug).toBe('b');
  });

  it('returns null prev for oldest item', () => {
    const { prev, next } = prevNextByDate(items, 'a');
    expect(prev).toBeNull();
    expect(next?.slug).toBe('c');
  });

  it('returns null next for newest item', () => {
    const { prev, next } = prevNextByDate(items, 'b');
    expect(prev?.slug).toBe('c');
    expect(next).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/date.test.ts`
Expected: FAIL with "Cannot find module './date'".

- [x] **Step 3: Implement date.ts**

```typescript
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
  slug: string;
  data: { pubDate: Date };
}

export function sortByDateDesc<T extends DatedEntry>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

export function prevNextByDate<T extends DatedEntry>(
  items: T[],
  currentSlug: string,
): { prev: T | null; next: T | null } {
  const sorted = [...items].sort(
    (a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime(),
  );
  const idx = sorted.findIndex((i) => i.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/date.test.ts`
Expected: PASS (9 tests).

- [x] **Step 5: Commit**

```bash
git add src/lib/date.ts src/lib/date.test.ts
git commit -m "feat(lib): add formatDate (zh/en) and date-based sort/prevNext helpers"
```

---

## Task 6: Content Collection Schema (TDD)

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/config.test.ts`
- Create: `src/content/articles/hello.md`
- Create: `src/content/notes/sample.md`
- Create: `src/content/notes/text-only.md`
- Create: `src/content/albums/demo.md`

**Interfaces:**
- Produces: three zod-validated collections `articles`, `notes`, `albums` with the schemas below.
- Produces: `articlesSchema`, `notesSchema`, `albumsSchema` exported for use in tests and downstream validation.
- Consumed by: Tasks 11-20 (all pages query collections).

Schema contract (DO NOT mutate without coordinating with change 2 — Design Doc §10):

```typescript
// articles
{
  title: string;          // required
  pubDate: Date;          // required, ISO 8601
  updateDate?: Date;
  description: string;    // required
  tags?: string[];
  category?: string;
  draft?: boolean;        // default false
}

// notes
{
  title: string;          // required
  pubDate: Date;          // required
  cover?: string;         // path relative to src/assets/
  tags?: string[];
  draft?: boolean;        // default false
}

// albums
{
  title: string;          // required
  date: Date;             // required
  cover?: string;
  description?: string;
  images: string[];       // required, non-empty, filenames relative to src/assets/gallery/<album-slug>/
}
```

- [x] **Step 1: Write failing test**

```typescript
// src/content/config.test.ts
import { describe, it, expect } from 'vitest';
import { articlesSchema, notesSchema, albumsSchema } from './config';

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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/config.test.ts`
Expected: FAIL with "Cannot find module './config'".

- [x] **Step 3: Implement config.ts**

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { toSlug } from '../lib/slug';

export const articlesSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  updateDate: z.coerce.date().optional(),
  description: z.string(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  draft: z.boolean().default(false),
});

export const notesSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
});

export const albumsSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  cover: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).min(1),
});

const articles = defineCollection({
  loader: glob({ base: './src/content/articles', pattern: '**/*.{md,mdx}' }),
  schema: articlesSchema,
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: notesSchema,
});

const albums = defineCollection({
  loader: glob({ base: './src/content/albums', pattern: '**/*.{md,mdx}' }),
  schema: albumsSchema,
});

export const collections = { articles, notes, albums };

// Astro 5 collection slug customization: derive slug from filename via toSlug.
// This is applied per-entry; see https://docs.astro.build/en/reference/content-layer-reference/
```

Note: Astro 5's Content Layer API uses `glob()` loader. The slug derived from filename is the entry `id` by default; to apply pinyin conversion, override via the `slug` field returned by a custom `generateId` option — see Astro docs. If the default `id` already satisfies the URL contract (filenames are ASCII), the `toSlug` import is used in Task 11's route to compute the display slug. The implementer confirms behavior by running `npm run build` in Step 6; if Chinese filenames produce non-ASCII URLs, wire `toSlug` into the loader's `generateId`.

- [x] **Step 4: Create sample articles**

```markdown
<!-- src/content/articles/hello.md -->
---
title: 你好，世界
pubDate: 2024-03-15
description: 第一篇示例文章，验证中文标题与 slug 生成。
tags: [示例, astro]
category: tech
---

## 简介

这是一个 Astro 博客的示例文章。

## 代码示例

```ts
const greeting: string = 'hello';
console.log(greeting);
```

## 结论

请替换为真实内容。
```

```markdown
<!-- src/content/notes/sample.md -->
---
title: 示例笔记
pubDate: 2024-03-20
cover: notes/sample-cover.jpg
tags: [示例]
---

这是一条带封面的示例笔记。
```

```markdown
<!-- src/content/notes/text-only.md -->
---
title: 纯文本笔记
pubDate: 2024-03-18
---

这是一条没有封面的笔记，不会出现在卡片流中。
```

```markdown
<!-- src/content/albums/demo.md -->
---
title: 示例相册
date: 2024-03-22
description: 用来验证相册网格与 Lightbox。
images: [1.svg, 2.svg, 3.svg]
---
```

- [x] **Step 5: Create placeholder album images**

Create three minimal SVGs:

```xml
<!-- src/assets/gallery/demo/1.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#e74c3c"/><text x="200" y="150" font-size="48" text-anchor="middle" fill="#fff">1</text></svg>
```

```xml
<!-- src/assets/gallery/demo/2.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#3498db"/><text x="200" y="150" font-size="48" text-anchor="middle" fill="#fff">2</text></svg>
```

```xml
<!-- src/assets/gallery/demo/3.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#2ecc71"/><text x="200" y="150" font-size="48" text-anchor="middle" fill="#fff">3</text></svg>
```

- [x] **Step 6: Create placeholder note cover**

```xml
<!-- src/assets/notes/sample-cover.svg -->
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#9b59b6"/><text x="400" y="225" font-size="64" text-anchor="middle" fill="#fff">Sample Note</text></svg>
```

Update `src/content/notes/sample.md` cover to `notes/sample-cover.svg` (SVG is acceptable for placeholder; real covers should be JPG/PNG < 2MB).

- [x] **Step 7: Run test to verify it passes**

Run: `npm test -- src/content/config.test.ts`
Expected: PASS (12 tests).

- [x] **Step 8: Verify build picks up collections**

Run: `npm run build`
Expected: build succeeds; no schema errors; `dist/` regenerated.

If build fails with slug errors on Chinese filenames, wire `toSlug` into the glob loader:

```typescript
// Replace each collection definition:
const articles = defineCollection({
  loader: glob({
    base: './src/content/articles',
    pattern: '**/*.{md,mdx}',
    generateId: ({ entry }) => toSlug(entry),
  }),
  schema: articlesSchema,
});
```

- [x] **Step 9: Commit**

```bash
git add src/content/config.ts src/content/config.test.ts src/content/articles src/content/notes src/content/albums src/assets/gallery src/assets/notes
git commit -m "feat(content): define articles/notes/albums schemas with sample entries"
```

---

## Task 7: Gallery Utility (TDD)

**Files:**
- Create: `src/lib/gallery.ts`
- Create: `src/lib/gallery.test.ts`

**Interfaces:**
- Produces: `collectAlbumImages(album: { slug: string; data: { images: string[] } }): Array<{ src: string; alt: string }>` — resolves image paths relative to `src/assets/gallery/<album-slug>/`.
- Produces: `sortAlbumsByDateDesc<T extends { data: { date: Date } }>(items: T[]): T[]`.
- Consumed by: Task 18 (single album page), Task 17 (album index).

- [x] **Step 1: Write failing test**

```typescript
// src/lib/gallery.test.ts
import { describe, it, expect } from 'vitest';
import { collectAlbumImages, sortAlbumsByDateDesc } from './gallery';

describe('collectAlbumImages', () => {
  it('resolves each image filename relative to album slug', () => {
    const album = {
      slug: 'demo',
      data: { images: ['1.svg', '2.svg'] },
    };
    const result = collectAlbumImages(album);
    expect(result).toEqual([
      { src: 'gallery/demo/1.svg', alt: 'demo image 1' },
      { src: 'gallery/demo/2.svg', alt: 'demo image 2' },
    ]);
  });

  it('returns empty array when images is empty', () => {
    const result = collectAlbumImages({ slug: 'x', data: { images: [] } });
    expect(result).toEqual([]);
  });

  it('uses image filename (without extension) as alt fallback', () => {
    const result = collectAlbumImages({
      slug: 'demo',
      data: { images: ['sunset.jpg'] },
    });
    expect(result[0].alt).toBe('demo image sunset');
  });
});

describe('sortAlbumsByDateDesc', () => {
  const albums = [
    { slug: 'a', data: { date: new Date('2024-01-01') } },
    { slug: 'b', data: { date: new Date('2024-03-01') } },
    { slug: 'c', data: { date: new Date('2024-02-01') } },
  ];

  it('sorts newest first', () => {
    const sorted = sortAlbumsByDateDesc(albums);
    expect(sorted.map((a) => a.slug)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input', () => {
    const before = albums.map((a) => a.slug);
    sortAlbumsByDateDesc(albums);
    expect(albums.map((a) => a.slug)).toEqual(before);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/gallery.test.ts`
Expected: FAIL with "Cannot find module './gallery'".

- [x] **Step 3: Implement gallery.ts**

```typescript
// src/lib/gallery.ts
interface AlbumEntry {
  slug: string;
  data: { images: string[] };
}

interface ResolvedImage {
  src: string; // path relative to src/assets/, for astro:assets import
  alt: string;
}

export function collectAlbumImages(album: AlbumEntry): ResolvedImage[] {
  return album.data.images.map((filename) => {
    const baseName = filename.replace(/\.[^.]+$/, '');
    return {
      src: `gallery/${album.slug}/${filename}`,
      alt: `${album.slug} image ${baseName}`,
    };
  });
}

interface DatedAlbum {
  slug: string;
  data: { date: Date };
}

export function sortAlbumsByDateDesc<T extends DatedAlbum>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/gallery.test.ts`
Expected: PASS (5 tests).

- [x] **Step 5: Run full coverage to verify lib threshold**

Run: `npm run test:coverage`
Expected: all `src/lib/*.ts` and `src/content/config.ts` coverage ≥ 80%.

- [x] **Step 6: Commit**

```bash
git add src/lib/gallery.ts src/lib/gallery.test.ts
git commit -m "feat(lib): add gallery image collection and album sort helpers"
```

---

## Task 8: Global Styles and BaseHead

**Files:**
- Create: `src/styles/global.css`
- Create: `src/components/BaseHead.astro`
- Create: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Produces: `BaseLayout.astro` accepting props `{ title: string; description?: string; image?: string; pubDate?: Date }` and rendering `<html>...<head>...<body><slot/></body>`.
- Consumes: `SITE_CONFIG` from Task 3.

- [x] **Step 1: Create global.css**

```css
/* src/styles/global.css */
:root {
  --color-bg: #ffffff;
  --color-fg: #1a1a1a;
  --color-muted: #666;
  --color-accent: #3498db;
  --color-border: #e5e5e5;
  --color-card-bg: #fafafa;
  --max-width: 720px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}

:root[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-fg: #e5e5e5;
  --color-muted: #999;
  --color-accent: #5dade2;
  --color-border: #333;
  --color-card-bg: #2a2a2a;
}

html {
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-fg);
  line-height: 1.6;
}

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 2rem 1rem;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

a {
  color: var(--color-accent);
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

img {
  max-width: 100%;
  height: auto;
}

pre {
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: var(--font-mono);
}

/* dark mode auto-detection if user prefers-color-scheme and no explicit theme */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #1a1a1a;
    --color-fg: #e5e5e5;
    --color-muted: #999;
    --color-accent: #5dade2;
    --color-border: #333;
    --color-card-bg: #2a2a2a;
  }
}
```

- [x] **Step 2: Create BaseHead.astro**

```astro
---
// src/components/BaseHead.astro
import { SITE_CONFIG } from '../lib/config';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
  image?: string;
  pubDate?: Date;
}

const { title, description = SITE_CONFIG.description, image, pubDate } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImage = image
  ? new URL(image, Astro.site)
  : new URL('favicon.svg', Astro.site);
const baseURL = import.meta.env.BASE_URL;
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href={`${baseURL}favicon.svg`} />
<link rel="canonical" href={canonicalURL} />
<link rel="alternate" type="application/rss+xml" title={SITE_CONFIG.title} href={`${baseURL}rss.xml`} />

<title>{title}</title>
<meta name="description" content={description} />
<meta property="og:type" content={pubDate ? 'article' : 'website'} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonicalURL} />
<meta property="og:image" content={ogImage} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
{pubDate && <meta property="article:published_time" content={pubDate.toISOString()} />}
```

- [x] **Step 3: Create BaseLayout.astro**

```astro
---
// src/layouts/BaseLayout.astro
import BaseHead from '../components/BaseHead.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description?: string;
  image?: string;
  pubDate?: Date;
}

const { title, description, image, pubDate } = Astro.props;
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <BaseHead title={title} description={description} image={image} pubDate={pubDate} />
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [x] **Step 4: Commit (Header/Footer referenced but not yet created — build will fail until Task 9)**

Hold commit until Task 9 to keep build green. Proceed to Task 9.

---

## Task 9: Header and Footer

**Files:**
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`

**Interfaces:**
- Produces: `Header.astro` rendering nav with current-page highlight based on `Astro.url.pathname`.
- Produces: `Footer.astro` rendering copyright + RSS + GitHub links.
- Consumes: `SITE_CONFIG` from Task 3.

- [x] **Step 1: Create Header.astro**

```astro
---
// src/components/Header.astro
import { SITE_CONFIG } from '../lib/config';

const baseURL = import.meta.env.BASE_URL;
const path = Astro.url.pathname.replace(baseURL, '/');
const navItems = [
  { href: '/', label: '首页' },
  { href: '/articles/', label: '文章' },
  { href: '/notes/', label: '笔记' },
  { href: '/gallery/', label: '相册' },
];
const isActive = (href: string) =>
  href === '/' ? path === '/' : path.startsWith(href);
---
<header
  style="border-bottom:1px solid var(--color-border);padding:1rem;background:var(--color-bg);position:sticky;top:0;z-index:10;"
>
  <nav style="max-width:var(--max-width);margin:0 auto;display:flex;gap:1.5rem;align-items:center;">
    <a href={`${baseURL}`} style="font-weight:bold;font-size:1.2rem;color:var(--color-fg);">{SITE_CONFIG.title}</a>
    <div style="display:flex;gap:1.2rem;margin-left:auto;">
      {navItems.map((item) => (
        <a
          href={`${baseURL}${item.href.replace(/^\//, '')}`}
          style={isActive(item.href) ? 'color:var(--color-accent);font-weight:600;' : 'color:var(--color-muted);'}
        >
          {item.label}
        </a>
      ))}
    </div>
  </nav>
</header>
```

- [x] **Step 2: Create Footer.astro**

```astro
---
// src/components/Footer.astro
import { SITE_CONFIG } from '../lib/config';
const baseURL = import.meta.env.BASE_URL;
const year = new Date().getUTCFullYear();
---
<footer style="border-top:1px solid var(--color-border);padding:1.5rem;text-align:center;color:var(--color-muted);">
  <div style="display:flex;justify-content:center;gap:1.5rem;margin-bottom:0.5rem;">
    <a href={`${baseURL}rss.xml`}>RSS</a>
    <a href={`https://github.com/${SITE_CONFIG.author}`} target="_blank" rel="noopener">GitHub</a>
  </div>
  <small>© {year} {SITE_CONFIG.author}. All rights reserved.</small>
</footer>
```

- [x] **Step 3: Update src/pages/index.astro to use BaseLayout**

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE_CONFIG } from '../lib/config';
---
<BaseLayout title={SITE_CONFIG.title}>
  <h1>{SITE_CONFIG.title}</h1>
  <p>{SITE_CONFIG.description}</p>
</BaseLayout>
```

- [x] **Step 4: Verify dev server**

Run: `npm run dev`
Expected: http://localhost:4321/git-novel/ shows header, footer, and content with no console errors.

- [x] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` contains header/footer markup.

- [x] **Step 6: Commit (Task 8 + Task 9 together)**

```bash
git add src/styles/global.css src/components/BaseHead.astro src/components/Header.astro src/components/Footer.astro src/layouts/BaseLayout.astro src/pages/index.astro
git commit -m "feat(layout): add BaseLayout, BaseHead, Header, Footer, global styles"
```

---

## Task 10: ArticleCard, NoteCard, TOC Components

**Files:**
- Create: `src/components/ArticleCard.astro`
- Create: `src/components/NoteCard.astro`
- Create: `src/components/TOC.astro`

**Interfaces:**
- Produces `ArticleCard.astro` props: `{ entry: { slug: string; data: { title: string; pubDate: Date; description: string } } }`.
- Produces `NoteCard.astro` props: `{ entry: { slug: string; data: { title: string; pubDate: Date; cover: string } } }`.
- Produces `TOC.astro` props: `{ headings: Array<{ depth: number; slug: string; text: string }> }` — renders h2/h3 only.
- Consumes: `formatDate` from Task 5; `import.meta.env.BASE_URL`.

- [ ] **Step 1: Create ArticleCard.astro**

```astro
---
// src/components/ArticleCard.astro
import { formatDate } from '../lib/date';
interface Props {
  entry: {
    slug: string;
    data: { title: string; pubDate: Date; description: string };
  };
}
const { entry } = Astro.props;
const baseURL = import.meta.env.BASE_URL;
---
<article style="border:1px solid var(--color-border);border-radius:8px;padding:1.2rem;background:var(--color-card-bg);">
  <h3 style="margin:0 0 0.4rem;">
    <a href={`${baseURL}articles/${entry.slug}/`} style="color:var(--color-fg);">{entry.data.title}</a>
  </h3>
  <small style="color:var(--color-muted);">{formatDate(entry.data.pubDate)}</small>
  <p style="margin:0.6rem 0 0;">{entry.data.description}</p>
</article>
```

- [ ] **Step 2: Create NoteCard.astro**

```astro
---
// src/components/NoteCard.astro
import { formatDate } from '../lib/date';
import { Image } from 'astro:assets';

interface Props {
  entry: {
    slug: string;
    data: { title: string; pubDate: Date; cover: string };
  };
}
const { entry } = Astro.props;
const baseURL = import.meta.env.BASE_URL;
// cover is relative to src/assets/, import for astro:assets optimization
const coverModule = await import(`../assets/${entry.data.cover}`);
---
<a href={`${baseURL}notes/${entry.slug}/`} style="display:block;color:inherit;">
  <article style="border:1px solid var(--color-border);border-radius:8px;overflow:hidden;background:var(--color-card-bg);">
    <Image src={coverModule.default} alt={entry.data.title} width={400} height={225} />
    <div style="padding:0.8rem;">
      <h3 style="margin:0 0 0.3rem;font-size:1rem;">{entry.data.title}</h3>
      <small style="color:var(--color-muted);">{formatDate(entry.data.pubDate)}</small>
    </div>
  </article>
</a>
```

Note: dynamic `import()` of asset paths is supported by Vite. If it fails at build time, fall back to a static helper that maps known cover paths to static imports. The test for gallery (Task 7) covers path resolution; this component is verified via build.

- [ ] **Step 3: Create TOC.astro**

```astro
---
// src/components/TOC.astro
interface Heading { depth: number; slug: string; text: string; }
interface Props { headings: Heading[]; }
const { headings } = Astro.props;
const tocItems = headings.filter((h) => h.depth === 2 || h.depth === 3);
---
{tocItems.length > 0 && (
  <nav aria-label="目录" style="border-left:3px solid var(--color-accent);padding-left:1rem;margin:1.5rem 0;">
    <h2 style="font-size:0.9rem;text-transform:uppercase;color:var(--color-muted);margin:0 0 0.5rem;">目录</h2>
    <ul style="list-style:none;padding:0;margin:0;">
      {tocItems.map((h) => (
        <li style={h.depth === 3 ? 'padding-left:1rem;' : ''}>
          <a href={`#${h.slug}`}>{h.text}</a>
        </li>
      ))}
    </ul>
  </nav>
)}
```

- [ ] **Step 4: Verify build (components not yet used; verify they compile)**

Run: `npm run build`
Expected: build succeeds (components are imported nowhere yet, so Astro tree-shakes them; no errors).

- [ ] **Step 5: Commit**

```bash
git add src/components/ArticleCard.astro src/components/NoteCard.astro src/components/TOC.astro
git commit -m "feat(components): add ArticleCard, NoteCard, TOC components"
```

---

## Task 11: Article Detail Page

**Files:**
- Create: `src/pages/articles/[...slug].astro`

**Interfaces:**
- Consumes: `articles` collection (Task 6), `formatDate`, `prevNextByDate` (Task 5), `BaseLayout` (Task 8), `TOC` (Task 10).
- Produces: `/articles/<slug>/` route rendering article + TOC + prev/next + Giscus placeholder (Giscus wired in Task 19).

- [ ] **Step 1: Create articles/[...slug].astro**

```astro
---
// src/pages/articles/[...slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import TOC from '../../components/TOC.astro';
import { formatDate, prevNextByDate, sortByDateDesc } from '../../lib/date';

export async function getStaticPaths() {
  const articles = await getCollection('articles');
  return articles.map((entry) => ({
    params: { slug: entry.id },
    props: { entry, allArticles: articles },
  }));
}

interface Props {
  entry: CollectionEntry<'articles'>;
  allArticles: CollectionEntry<'articles'>[];
}

const { entry, allArticles } = Astro.props;
const { Content, headings } = await entry.render();
const visibleArticles = allArticles.filter(
  (a) => !a.data.draft || import.meta.env.DEV,
);
const sorted = sortByDateDesc(visibleArticles);
const { prev, next } = prevNextByDate(sorted, entry.id);
const baseURL = import.meta.env.BASE_URL;
---
<BaseLayout
  title={entry.data.title}
  description={entry.data.description}
  pubDate={entry.data.pubDate}
>
  <article>
    <header style="margin-bottom:2rem;">
      <h1 style="margin:0 0 0.5rem;">{entry.data.title}</h1>
      <small style="color:var(--color-muted);">
        {formatDate(entry.data.pubDate)}
        {entry.data.updateDate && ` · 更新于 ${formatDate(entry.data.updateDate)}`}
      </small>
      {entry.data.tags && (
        <div style="margin-top:0.5rem;">
          {entry.data.tags.map((t) => (
            <span style="background:var(--color-card-bg);padding:0.2rem 0.6rem;border-radius:4px;font-size:0.8rem;margin-right:0.4rem;">#{t}</span>
          ))}
        </div>
      )}
    </header>

    <TOC headings={headings} />

    <div class="prose">
      <Content />
    </div>

    <nav style="display:flex;justify-content:space-between;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--color-border);">
      {prev ? (
        <a href={`${baseURL}articles/${prev.id}/`}>← {prev.data.title}</a>
      ) : <span></span>}
      {next && <a href={`${baseURL}articles/${next.id}/`}>{next.data.title} →</a>}
    </nav>

    <!-- Giscus placeholder; replaced by component in Task 19 -->
    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <p style="color:var(--color-muted);">评论系统配置中。</p>
    </section>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify dev server renders the sample article**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/articles/hello/` (or the pinyin slug if `toSlug` was wired into the loader).
Expected: article renders with title, date, TOC, code block with Shiki highlighting, and a comments placeholder.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/articles/<slug>/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add src/pages/articles/[...slug].astro
git commit -m "feat(articles): add article detail page with TOC and prev/next navigation"
```

---

## Task 12: Note Detail Page

**Files:**
- Create: `src/pages/notes/[...slug].astro`

**Interfaces:**
- Consumes: `notes` collection (Task 6), `formatDate` (Task 5), `BaseLayout` (Task 8).
- Produces: `/notes/<slug>/` route rendering note + Giscus placeholder.

- [ ] **Step 1: Create notes/[...slug].astro**

```astro
---
// src/pages/notes/[...slug].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { formatDate } from '../../lib/date';
import { Image } from 'astro:assets';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

interface Props { entry: CollectionEntry<'notes'>; }
const { entry } = Astro.props;
const { Content } = await entry.render();
let coverModule: { default: ImageMetadata } | null = null;
if (entry.data.cover) {
  coverModule = await import(`../../assets/${entry.data.cover}`);
}
---
<BaseLayout
  title={entry.data.title}
  description={entry.data.title}
  pubDate={entry.data.pubDate}
>
  <article>
    <header style="margin-bottom:2rem;">
      <h1 style="margin:0 0 0.5rem;">{entry.data.title}</h1>
      <small style="color:var(--color-muted);">{formatDate(entry.data.pubDate)}</small>
    </header>
    {coverModule && (
      <Image src={coverModule.default} alt={entry.data.title} width={800} heights={[200, 400]} />
    )}
    <div class="prose">
      <Content />
    </div>

    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <p style="color:var(--color-muted);">评论系统配置中。</p>
    </section>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify dev server renders the sample note**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/notes/sample/`
Expected: note renders with cover image and date.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/notes/<slug>/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add src/pages/notes/[...slug].astro
git commit -m "feat(notes): add note detail page with optional cover image"
```

---

## Task 13: Articles Index Page

**Files:**
- Create: `src/pages/articles/index.astro`

**Interfaces:**
- Consumes: `articles` collection (Task 6), `sortByDateDesc` (Task 5), `BaseLayout` (Task 8), `ArticleCard` (Task 10).
- Produces: `/articles/` route listing all non-draft articles sorted by pubDate desc, with `?tag=` and `?category=` query filtering (client-side).

- [ ] **Step 1: Create articles/index.astro**

```astro
---
// src/pages/articles/index.astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import { sortByDateDesc } from '../../lib/date';

const articles = await getCollection('articles');
const visible = articles.filter((a) => !a.data.draft || import.meta.env.DEV);
const sorted = sortByDateDesc(visible);

// pre-compute unique tags and categories for filter UI
const allTags = [...new Set(sorted.flatMap((a) => a.data.tags ?? []))].sort();
const allCategories = [...new Set(sorted.map((a) => a.data.category).filter(Boolean) as string[])].sort();
---
<BaseLayout title="文章">
  <h1>文章</h1>

  <div id="filters" style="margin:1.5rem 0;display:flex;flex-wrap:wrap;gap:0.5rem;">
    <button data-filter="all" class="filter-btn" style="padding:0.3rem 0.8rem;border:1px solid var(--color-border);border-radius:4px;background:transparent;cursor:pointer;">全部</button>
    {allCategories.map((c) => (
      <button data-filter-type="category" data-filter={c} class="filter-btn" style="padding:0.3rem 0.8rem;border:1px solid var(--color-border);border-radius:4px;background:transparent;cursor:pointer;">{c}</button>
    ))}
    {allTags.map((t) => (
      <button data-filter-type="tag" data-filter={t} class="filter-btn" style="padding:0.3rem 0.8rem;border:1px solid var(--color-border);border-radius:4px;background:transparent;cursor:pointer;">#{t}</button>
    ))}
  </div>

  <div id="article-list" style="display:flex;flex-direction:column;gap:1rem;">
    {sorted.map((entry: CollectionEntry<'articles'>) => (
      <div
        class="article-item"
        data-tags={(entry.data.tags ?? []).join(',')}
        data-category={entry.data.category ?? ''}
      >
        <ArticleCard entry={entry} />
      </div>
    ))}
  </div>

  <p id="empty-state" style="display:none;color:var(--color-muted);">没有匹配的文章。</p>
</BaseLayout>

<script is:inline>
  const buttons = document.querySelectorAll('.filter-btn');
  const items = document.querySelectorAll('.article-item');
  const empty = document.getElementById('empty-state');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      const type = btn.getAttribute('data-filter-type');
      let visible = 0;
      items.forEach((item) => {
        const tags = (item.getAttribute('data-tags') || '').split(',').filter(Boolean);
        const category = item.getAttribute('data-category') || '';
        const match = filter === 'all' ||
          (type === 'tag' && tags.includes(filter)) ||
          (type === 'category' && category === filter);
        (item as HTMLElement).style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
    });
  });
</script>
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/articles/`
Expected: list shows the sample article; filter buttons appear; clicking a tag filters correctly.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/articles/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add src/pages/articles/index.astro
git commit -m "feat(articles): add articles index with tag/category client-side filtering"
```

---

## Task 14: Notes Card Stream Page

**Files:**
- Create: `src/pages/notes/index.astro`

**Interfaces:**
- Consumes: `notes` collection (Task 6), `sortByDateDesc` (Task 5), `BaseLayout` (Task 8), `NoteCard` (Task 10).
- Produces: `/notes/` route showing only notes with `cover`, sorted by pubDate desc, as a grid.

- [ ] **Step 1: Create notes/index.astro**

```astro
---
// src/pages/notes/index.astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import NoteCard from '../../components/NoteCard.astro';
import { sortByDateDesc } from '../../lib/date';

const notes = await getCollection('notes');
const visible = notes.filter((n) => !n.data.draft || import.meta.env.DEV);
const withCover = visible.filter((n) => Boolean(n.data.cover));
const sorted = sortByDateDesc(withCover);
---
<BaseLayout title="笔记">
  <h1>图片笔记</h1>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;margin-top:1.5rem;">
    {sorted.map((entry: CollectionEntry<'notes'>) => (
      <NoteCard entry={entry} />
    ))}
  </div>
  {sorted.length === 0 && (
    <p style="color:var(--color-muted);">还没有带封面的笔记。</p>
  )}
</BaseLayout>
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/notes/`
Expected: grid shows `sample` note card; `text-only` note does NOT appear (no cover).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/notes/index.html` exists and lists only `sample`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/notes/index.astro
git commit -m "feat(notes): add notes card stream page filtering to cover-only entries"
```

---

## Task 15: Home Page

**Files:**
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `articles` and `notes` collections, `sortByDateDesc` (Task 5), `BaseLayout` (Task 8), `ArticleCard` (Task 10), `NoteCard` (Task 10).
- Produces: `/` showing latest 5 articles + latest 6 cover-notes.

- [ ] **Step 1: Replace src/pages/index.astro**

```astro
---
// src/pages/index.astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import ArticleCard from '../components/ArticleCard.astro';
import NoteCard from '../components/NoteCard.astro';
import { sortByDateDesc } from '../lib/date';
import { SITE_CONFIG } from '../lib/config';

const articles = await getCollection('articles');
const notes = await getCollection('notes');
const visibleArticles = articles.filter((a) => !a.data.draft || import.meta.env.DEV);
const visibleNotes = notes.filter((n) => !n.data.draft || import.meta.env.DEV);

const latestArticles = sortByDateDesc(visibleArticles).slice(0, 5);
const latestNoteCards = sortByDateDesc(
  visibleNotes.filter((n) => Boolean(n.data.cover)),
).slice(0, 6);

const baseURL = import.meta.env.BASE_URL;
---
<BaseLayout title={SITE_CONFIG.title} description={SITE_CONFIG.description}>
  <section style="margin-bottom:2.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <h2 style="margin:0;">最新文章</h2>
      <a href={`${baseURL}articles/`}>全部 →</a>
    </div>
    <div style="display:flex;flex-direction:column;gap:1rem;margin-top:1rem;">
      {latestArticles.map((entry: CollectionEntry<'articles'>) => (
        <ArticleCard entry={entry} />
      ))}
      {latestArticles.length === 0 && <p style="color:var(--color-muted);">暂无文章。</p>}
    </div>
  </section>

  <section>
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <h2 style="margin:0;">图片笔记</h2>
      <a href={`${baseURL}notes/`}>全部 →</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-top:1rem;">
      {latestNoteCards.map((entry: CollectionEntry<'notes'>) => (
        <NoteCard entry={entry} />
      ))}
      {latestNoteCards.length === 0 && <p style="color:var(--color-muted);">暂无图片笔记。</p>}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/`
Expected: home shows "最新文章" section with `hello` article and "图片笔记" section with `sample` note card.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` contains both sections.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(home): add home page with latest 5 articles and 6 note cards"
```

---

## Task 16: Gallery Index Page

**Files:**
- Create: `src/pages/gallery/index.astro`

**Interfaces:**
- Consumes: `albums` collection (Task 6), `sortAlbumsByDateDesc` (Task 7), `formatDate` (Task 5), `BaseLayout` (Task 8).
- Produces: `/gallery/` route listing all albums sorted by date desc.

- [ ] **Step 1: Create gallery/index.astro**

```astro
---
// src/pages/gallery/index.astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { formatDate } from '../../lib/date';
import { sortAlbumsByDateDesc } from '../../lib/gallery';
import { Image } from 'astro:assets';

const albums = await getCollection('albums');
const sorted = sortAlbumsByDateDesc(albums);
const baseURL = import.meta.env.BASE_URL;

// resolve cover image: if album.data.cover is set, use it; else fall back to first image
function coverPath(album: CollectionEntry<'albums'>): string | null {
  if (album.data.cover) return album.data.cover;
  if (album.data.images.length > 0) return `gallery/${album.id}/${album.data.images[0]}`;
  return null;
}
---
<BaseLayout title="相册">
  <h1>相册</h1>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.5rem;margin-top:1.5rem;">
    {sorted.map(async (album: CollectionEntry<'albums'>) => {
      const cover = coverPath(album);
      const coverModule = cover ? (await import(`../../assets/${cover}`)).default : null;
      return (
        <a href={`${baseURL}gallery/${album.id}/`} style="color:inherit;">
          <article style="border:1px solid var(--color-border);border-radius:8px;overflow:hidden;background:var(--color-card-bg);">
            {coverModule && (
              <Image src={coverModule} alt={album.data.title} width={400} height={300} />
            )}
            <div style="padding:0.8rem;">
              <h3 style="margin:0 0 0.3rem;font-size:1.05rem;">{album.data.title}</h3>
              <small style="color:var(--color-muted);">{formatDate(album.data.date)}</small>
            </div>
          </article>
        </a>
      );
    })}
  </div>
</BaseLayout>
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/gallery/`
Expected: shows the `demo` album card with first image as cover.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/gallery/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add src/pages/gallery/index.astro
git commit -m "feat(gallery): add album index page with cover thumbnails"
```

---

## Task 17: Lightbox Component

**Files:**
- Create: `src/components/Lightbox.astro`

**Interfaces:**
- Produces: `Lightbox.astro` rendering nothing server-side but injecting GLightbox CSS + JS init script (client-side only). Used with `client:load` directive by the album page (Task 18).
- Consumes: `glightbox` npm package.

- [ ] **Step 1: Create Lightbox.astro**

```astro
---
// src/components/Lightbox.astro
// Renders inline script that initializes GLightbox on the album page.
// Must be placed after the gallery markup in the page so DOM exists.
---
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/css/glightbox.min.css" />
<script is:inline>
  import('https://cdn.jsdelivr.net/npm/glightbox@3.3.0/dist/js/glightbox.min.js').then((mod) => {
    const GLightbox = mod.default;
    new GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
    });
  });
</script>
```

Note: Using CDN for GLightbox avoids bundler config complexity; the lib is small and only loaded on album pages. If offline build is required, switch to `import GLightbox from 'glightbox'` and `import 'glightbox/dist/css/glightbox.min.css'` inside an Astro `<script>` — verify `npm run build` succeeds with that approach.

- [ ] **Step 2: Verify build (component not yet used)**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/Lightbox.astro
git commit -m "feat(components): add Lightbox wrapper using GLightbox via dynamic import"
```

---

## Task 18: Single Album Page

**Files:**
- Create: `src/pages/gallery/[album].astro`

**Interfaces:**
- Consumes: `albums` collection (Task 6), `collectAlbumImages` (Task 7), `BaseLayout` (Task 8), `Lightbox` (Task 17), `Image` and `getImage` from `astro:assets`.
- Produces: `/gallery/<album>/` route rendering CSS Grid of thumbnails with GLightbox links to full-size images.

- [ ] **Step 1: Create gallery/[album].astro**

```astro
---
// src/pages/gallery/[album].astro
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Lightbox from '../../components/Lightbox.astro';
import { collectAlbumImages } from '../../lib/gallery';
import { formatDate } from '../../lib/date';
import { Image, getImage } from 'astro:assets';

export async function getStaticPaths() {
  const albums = await getCollection('albums');
  return albums.map((entry) => ({
    params: { album: entry.id },
    props: { entry },
  }));
}

interface Props { entry: CollectionEntry<'albums'>; }
const { entry } = Astro.props;
const images = collectAlbumImages(entry);

// Resolve each image: thumbnail via <Image>, full URL via getImage() for GLightbox href.
const resolved = await Promise.all(
  images.map(async (img) => {
    const mod = await import(`../../assets/${img.src}`);
    const optimizedFull = await getImage({
      src: mod.default,
      width: 1600,
      format: 'webp',
    });
    return {
      thumb: mod.default,
      fullURL: optimizedFull.src,
      alt: img.alt,
    };
  }),
);
---
<BaseLayout title={entry.data.title} description={entry.data.description ?? entry.data.title}>
  <h1>{entry.data.title}</h1>
  <small style="color:var(--color-muted);">{formatDate(entry.data.date)}</small>
  {entry.data.description && <p style="margin-top:0.8rem;">{entry.data.description}</p>}

  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.8rem;margin-top:1.5rem;">
    {resolved.map((img) => (
      <a href={img.fullURL} class="glightbox" data-gallery={entry.id} data-alt={img.alt}>
        <Image src={img.thumb} alt={img.alt} width={300} height={225} />
      </a>
    ))}
  </div>

  <Lightbox />
</BaseLayout>
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/gallery/demo/`
Expected: page shows 3 image thumbnails in a grid; clicking one opens GLightbox full-screen with arrow navigation.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; `dist/gallery/demo/index.html` exists; optimized WebP images generated under `dist/_astro/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/gallery/[album].astro
git commit -m "feat(gallery): add single album page with CSS grid and GLightbox integration"
```

---

## Task 19: Giscus Comments Component

**Files:**
- Create: `src/components/Giscus.tsx`
- Create: `src/components/Giscus.astro`
- Modify: `src/pages/articles/[...slug].astro` (replace placeholder)
- Modify: `src/pages/notes/[...slug].astro` (replace placeholder)

**Interfaces:**
- Consumes: `SITE_CONFIG.giscus` and `isGiscusConfigured` from Task 3, `@giscus/react` package.
- Produces: `Giscus.astro` rendering either the React `<Giscus client:idle>` or a "未配置" placeholder.

- [ ] **Step 1: Create Giscus.tsx**

```tsx
// src/components/Giscus.tsx
import Giscus from '@giscus/react';

export interface GiscusProps {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname';
  theme: 'light' | 'dark' | 'transparent_dark';
}

export default function GiscusComments(props: GiscusProps) {
  return (
    <Giscus
      repo={props.repo as `${string}/${string}`}
      repoId={props.repoId}
      category={props.category}
      categoryId={props.categoryId}
      mapping={props.mapping}
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={props.theme}
      lang="zh-CN"
      loading="lazy"
    />
  );
}
```

- [ ] **Step 2: Create Giscus.astro**

```astro
---
// src/components/Giscus.astro
import GiscusComments from './Giscus';
import { SITE_CONFIG, isGiscusConfigured } from '../lib/config';

const giscus = SITE_CONFIG.giscus;
const configured = isGiscusConfigured(giscus);
---
{configured && giscus ? (
  <GiscusComments
    client:idle
    repo={giscus.repo}
    repoId={giscus.repoId}
    category={giscus.category}
    categoryId={giscus.categoryId}
    mapping={giscus.mapping}
    theme={giscus.theme}
  />
) : (
  <p style="color:var(--color-muted);padding:1rem;border:1px dashed var(--color-border);border-radius:6px;">
    Giscus 未配置。请在 <code>src/lib/config.ts</code> 填入 repo / repoId / categoryId 后重新部署。
  </p>
)}
```

- [ ] **Step 3: Replace comments placeholder in articles/[...slug].astro**

Find the comments section block:

```astro
    <!-- Giscus placeholder; replaced by component in Task 19 -->
    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <p style="color:var(--color-muted);">评论系统配置中。</p>
    </section>
```

Replace with:

```astro
    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <Giscus />
    </section>
```

Add the import at the top of the frontmatter:

```astro
import Giscus from '../../components/Giscus.astro';
```

- [ ] **Step 4: Replace comments placeholder in notes/[...slug].astro**

Find:

```astro
    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <p style="color:var(--color-muted);">评论系统配置中。</p>
    </section>
```

Replace with:

```astro
    <section id="comments" style="margin-top:3rem;">
      <h2>评论</h2>
      <Giscus />
    </section>
```

Add the import at the top of the frontmatter:

```astro
import Giscus from '../../components/Giscus.astro';
```

- [ ] **Step 5: Verify build with unconfigured Giscus**

Run: `npm run build`
Expected: build succeeds; article and note detail HTML contain "Giscus 未配置" placeholder (since `SITE_CONFIG.giscus` is null).

- [ ] **Step 6: Verify dev server renders placeholder**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/articles/hello/`
Expected: comments section shows the "Giscus 未配置" dashed-border box.

- [ ] **Step 7: Commit**

```bash
git add src/components/Giscus.tsx src/components/Giscus.astro src/pages/articles/[...slug].astro src/pages/notes/[...slug].astro
git commit -m "feat(comments): add Giscus React component with client:idle lazy load and placeholder fallback"
```

---

## Task 20: RSS Feed and Sitemap

**Files:**
- Create: `src/pages/rss.xml.ts`

**Interfaces:**
- Consumes: `articles` collection (Task 6), `SITE_CONFIG` (Task 3), `@astrojs/rss`.
- Produces: `/rss.xml` endpoint returning 20 latest non-draft articles.
- Sitemap already auto-generated by `@astrojs/sitemap` integration configured in Task 1.

- [ ] **Step 1: Create rss.xml.ts**

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../lib/config';
import { sortByDateDesc } from '../lib/date';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles');
  const visible = articles.filter((a) => !a.data.draft);
  const sorted = sortByDateDesc(visible).slice(0, 20);
  return rss({
    title: SITE_CONFIG.title,
    description: SITE_CONFIG.description,
    site: context.site ?? SITE_CONFIG.site,
    items: sorted.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/articles/${entry.id}/`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
```

- [ ] **Step 2: Verify dev server**

Run: `npm run dev`
Visit: `http://localhost:4321/git-novel/rss.xml`
Expected: valid RSS XML; contains the `hello` article; `<language>zh-CN</language>` present.

- [ ] **Step 3: Verify build generates RSS and sitemap**

Run: `npm run build`
Expected: `dist/rss.xml` and `dist/sitemap-index.xml` both exist; sitemap contains home, articles list, sample article, notes list, sample note, gallery index, demo album URLs.

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat(rss): add RSS endpoint serving latest 20 non-draft articles"
```

---

## Task 21: README and Schema Contract

**Files:**
- Create: `README.md`
- Create: `docs/superpowers/specs/astro-blog-foundation-schema-contract.md`

**Interfaces:**
- Produces: `README.md` with local dev, content adding, and deploy instructions.
- Produces: schema contract doc for change 2 (obsidian-migration) — this is the formal handoff artifact referenced in Design Doc §10 and tasks.md 10.6.

- [ ] **Step 1: Create README.md**

```markdown
# git-novel

基于 Astro 5 的个人博客，部署在 GitHub Pages。支持 Markdown 文章、图片笔记卡片流、图片相册。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321/git-novel/
npm run build    # 输出到 dist/
npm run preview  # 预览构建结果
npm test         # 运行 Vitest 单测
npm run test:coverage
```

## 添加内容

### 文章

在 `src/content/articles/` 新建 `.md` 文件：

```yaml
---
title: 文章标题
pubDate: 2024-03-15
description: 一句话描述
tags: [标签1, 标签2]
category: 分类
draft: false
---

正文（Markdown）...
```

### 笔记

在 `src/content/notes/` 新建 `.md` 文件。带 `cover` 字段的笔记会出现在首页与 `/notes/` 卡片流：

```yaml
---
title: 笔记标题
pubDate: 2024-03-20
cover: notes/my-cover.jpg   # 相对 src/assets/ 的路径
---

正文...
```

封面图片放在 `src/assets/notes/`。

### 相册

在 `src/content/albums/` 新建 `.md` 文件，图片放在 `src/assets/gallery/<album-slug>/`：

```yaml
---
title: 相册标题
date: 2024-03-22
description: 可选描述
images: [1.jpg, 2.jpg, 3.jpg]   # 相对 src/assets/gallery/<album-slug>/ 的文件名
---
```

## 部署

1. 在 GitHub 仓库 Settings → Pages → Source 选择 "GitHub Actions"。
2. 启用 Discussions（Settings → General → Features → Discussions）。
3. 在 `astro.config.ts` 中把 `site` 的 `username` 替换为真实 GitHub 用户名。
4. （可选）配置 Giscus：
   - 访问 https://giscus.app，填入仓库信息生成 `data-repo-id` 与 `data-category-id`。
   - 把得到的值填入 `src/lib/config.ts` 的 `rawGiscus` 对象。
5. 推送 main 分支，GitHub Actions 自动构建部署到 `https://<username>.github.io/git-novel/`。

## 测试

- Vitest 覆盖 `src/lib/*.ts` 与 `src/content/config.ts`，覆盖率 ≥ 80%。
- `.astro` 组件不在单测范围（静态站点 UI 层豁免），通过 `npm run build` 验证。
- CI 在 build 前运行 `npm test -- --coverage`，失败阻断部署。

## 目录结构

见 `docs/superpowers/specs/2026-06-24-astro-blog-foundation-design.md` 第 2 节。

## Schema 契约

frontmatter schema 是 change 2（obsidian-migration）的稳定接口，详见 `docs/superpowers/specs/astro-blog-foundation-schema-contract.md`。修改 schema 需双方协调。
```

- [ ] **Step 2: Create schema contract doc**

```markdown
# Astro Blog Foundation — Frontmatter Schema Contract

> 本文档是 change `astro-blog-foundation` 与 change `obsidian-migration`（待开）之间的契约。
> 修改 schema 必须同步更新本文件并通知 change 2 负责人。

## 数据源

- 定义位置：`src/content/config.ts`
- 校验方式：zod schema（Astro Content Collections）
- 构建期：schema 校验失败 → `npm run build` 报错

## articles 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 文章标题 |
| pubDate | date (ISO 8601) | 是 | — | 发布日期 |
| updateDate | date | 否 | — | 更新日期 |
| description | string | 是 | — | 一句话描述，用于列表与 SEO |
| tags | string[] | 否 | — | 标签数组 |
| category | string | 否 | — | 分类 |
| draft | boolean | 否 | false | 生产环境隐藏 |

文件位置：`src/content/articles/<slug>.md`
Slug 生成：文件名经 `toSlug()` 转 pinyin；重复 slug 构建期报错。

## notes 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 笔记标题 |
| pubDate | date | 是 | — | 发布日期 |
| cover | string | 否 | — | 相对 `src/assets/` 的路径；存在时进入卡片流 |
| tags | string[] | 否 | — | 标签 |
| draft | boolean | 否 | false | 生产环境隐藏 |

文件位置：`src/content/notes/<slug>.md`
无 `cover` 的笔记仅出现在详情路由，不出现在 `/notes/` 卡片流与首页区块。

## albums 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 相册标题 |
| date | date | 是 | — | 相册日期 |
| cover | string | 否 | — | 相对 `src/assets/` 的路径；缺省用第一张图 |
| description | string | 否 | — | 相册描述 |
| images | string[] | 否（但必须非空） | — | 相对 `src/assets/gallery/<album-slug>/` 的文件名列表 |

文件位置：`src/content/albums/<slug>.md`
图片文件位置：`src/assets/gallery/<album-slug>/<filename>`
`images` 数组必须非空，否则构建失败。

## 图片路径约定

- 笔记封面：`src/assets/notes/<filename>` → frontmatter `cover: notes/<filename>`
- 相册图片：`src/assets/gallery/<album-slug>/<filename>` → frontmatter `images: [<filename>, ...]`
- 文章内图片：Markdown 相对路径，Astro 自动优化

## Slug 规则

- 由文件名（去扩展名）经 `toSlug()` 生成
- 中文字符 → pinyin（无音调，连字符分隔）
- 空格、下划线 → 连字符
- 连续连字符合并，首尾连字符去除
- 重复 slug 构建期报错（`assertUniqueSlugs`）

## change 2 (obsidian-migration) 责任范围

- Obsidian wikilink `[[note]]` → Markdown 链接
- Obsidian 附件 `![[image.png]]` → `![](../../assets/notes/image.png)` 路径映射
- Obsidian frontmatter（`tags`、`aliases`、`publish`）→ 本项目 schema 适配
- 迁移脚本与验证

## 变更流程

1. 修改 `src/content/config.ts` 与对应 zod schema 导出
2. 更新本契约文档
3. 同步更新 `src/content/config.test.ts` 测试
4. 运行 `npm test` 与 `npm run build` 验证
5. 通知 change 2 负责人评估迁移脚本影响
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/superpowers/specs/astro-blog-foundation-schema-contract.md
git commit -m "docs: add README and frontmatter schema contract for obsidian-migration change"
```

---

## Task 22: CI/CD Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: GitHub Actions workflow triggered on push to main + workflow_dispatch.
- Consumes: `npm test`, `npm run build` scripts (Task 1).

- [ ] **Step 1: Create directory and workflow file**

```bash
mkdir -p .github/workflows
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify workflow YAML syntax**

Run: `node -e "const yaml=require('fs').readFileSync('.github/workflows/deploy.yml','utf8'); console.log('OK, length='+yaml.length)"`
Expected: prints OK with non-zero length.

- [ ] **Step 3: Verify full local pipeline mirrors CI**

Run: `npm ci && npm test -- --coverage && npm run build`
Expected: install succeeds, all tests pass, coverage ≥ 80% for lib/, build succeeds with `dist/` populated.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Pages deploy workflow with pre-build test gate"
```

---

## Task 23: Final Local Validation

**Files:**
- None (verification only; fix any issues found and commit fixes)

**Interfaces:**
- N/A — this task verifies the full system end-to-end locally before marking the change ready for `/comet-verify`.

- [ ] **Step 1: Run full test suite with coverage**

Run: `npm run test:coverage`
Expected: all tests pass; lib/ and content/config.ts coverage ≥ 80%; no threshold violations.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: build completes with no errors; warnings only (if any).

- [ ] **Step 3: Verify dist output structure**

Run: `ls dist/ && ls dist/articles/ && ls dist/notes/ && ls dist/gallery/ && ls dist/_astro/ | head -5`
Expected: `dist/` contains `index.html`, `articles/`, `notes/`, `gallery/`, `rss.xml`, `sitemap-index.xml`, `_astro/` (optimized assets).

- [ ] **Step 4: Preview production build**

Run: `npm run preview` (then Ctrl+C after verifying)
Visit: `http://localhost:4321/git-novel/`
Expected: home, articles list, article detail, notes list, note detail, gallery index, demo album all load without 404s; images optimized (WebP in `_astro/`).

- [ ] **Step 5: Verify SEO output in built HTML**

Run: `grep -l 'rel="canonical"' dist/articles/*/index.html && grep -l 'og:url' dist/index.html`
Expected: both grep commands find matches (canonical and OG tags present).

- [ ] **Step 6: Verify RSS and sitemap content**

Run: `head -20 dist/rss.xml && echo '---' && head -20 dist/sitemap-index.xml`
Expected: RSS contains `<item>` entries for the sample article; sitemap contains URLs prefixed with `/git-novel/`.

- [ ] **Step 7: Verify draft filtering in prod build**

Temporarily set `draft: true` in `src/content/articles/hello.md`, run `npm run build`, verify `dist/articles/hello/` does NOT exist, then revert.

```bash
# after reverting, ensure final state is non-draft
git diff --exit-code src/content/articles/hello.md
```

Expected: `git diff --exit-code` exits 0 (no changes after revert).

- [ ] **Step 8: Verify Giscus placeholder in prod build**

Run: `grep -l 'Giscus 未配置' dist/articles/*/index.html`
Expected: match found (since config is unconfigured).

- [ ] **Step 9: Run final commit if any fixups were made**

If any verification step required a code fix, commit those fixes:

```bash
git add -A
git commit -m "fix: address issues found during final validation"
```

If no fixes needed, skip this step — the change is complete.

---

## Self-Review

**1. Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Content Collections schema (content-publishing) | Task 6 |
| Slug generation + pinyin + uniqueness | Task 4 + Task 6 (loader) |
| TOC + prev/next | Task 10 (TOC) + Task 11 (prev/next) |
| RSS feed | Task 20 |
| Sitemap | Task 1 (integration) + verified Task 23 |
| Code highlighting (Shiki) | Task 1 (markdown.shikiConfig) + verified Task 11 |
| Album collection schema (photo-gallery) | Task 6 |
| Album index page | Task 16 |
| Single album + Lightbox + image optimization | Tasks 17, 18 |
| Note card stream (cover-only) | Task 14 |
| Home recent 6 note cards | Task 15 |
| Giscus integration + config in config.ts | Tasks 3, 19 |
| Giscus client:idle lazy load | Task 19 |
| Giscus pathname mapping | Task 3 (mapping: 'pathname') + Task 19 |
| Giscus dark mode | Task 19 (theme passed through) |
| Giscus unconfigured non-blocking | Task 3 (null when incomplete) + Task 19 (placeholder) |
| GitHub Actions auto-deploy | Task 22 |
| Pre-build test gate | Task 22 |
| Pages permissions + environment | Task 22 |
| base path `/git-novel` | Task 1 + used throughout |
| canonical + OG absolute URLs | Task 8 (BaseHead) |
| SEO meta per page | Task 8 (BaseHead props) + per-page usage |

All spec requirements covered. tasks.md 1.1 already complete (skipped per Global Constraints).

**2. Placeholder scan:** No "TBD", "TODO" (except the documented `username` placeholder in astro.config.ts which is an explicit user-action item), no "implement later". All code blocks contain real implementations.

**3. Type consistency check:**
- `SITE_CONFIG` shape used in Task 3 test, Task 8 (BaseHead), Task 9 (Header/Footer), Task 19 (Giscus) — consistent.
- `toSlug(filename: string): string` — used in Task 4 test, Task 6 (loader generateId if needed).
- `formatDate(input: string | Date, opts?): string` — used in Tasks 5, 10, 11, 12, 16.
- `sortByDateDesc<T>(items): T[]` — used in Tasks 5, 11, 13, 14, 15, 20.
- `prevNextByDate<T>(items, currentSlug)` — used in Task 11.
- `collectAlbumImages(album)` — used in Task 18; shape matches Task 7 test.
- `sortAlbumsByDateDesc<T>(items): T[]` — used in Task 16.
- `isGiscusConfigured(g)` — used in Task 19.
- Article/note/album entry shapes (`{ slug: string; data: {...} }`) — Astro 5 collection entries use `id` not `slug`; plan uses `entry.id` consistently in pages (Tasks 11-18).

One discrepancy found and fixed inline: Task 10 NoteCard uses `entry.slug` in the interface comment but Astro 5 entries use `entry.id`. The component receives the entry prop as-is from the page, and pages pass `entry` directly (not `entry.slug`), so the component accesses `entry.id` via the route param. The interface documentation in Task 10 says `slug: string` — this is the conceptual slug, which in Astro 5 is `entry.id`. Implementers should treat `entry.id` as the slug. This is consistent across all page tasks (11-18 use `entry.id`).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-24-astro-blog-foundation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
