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
  repo: 'TZB-Loong/git-novel',
  repoId: 'R_kgDOTE0iKQ',
  category: 'Announcements',
  categoryId: 'DIC_kwDOTE0iKc4C_3He',
  mapping: 'pathname' as const,
  theme: 'light' as const,
};

export const SITE_CONFIG: SiteConfig = {
  site: 'https://TZB-Loong.github.io',
  base: '/git-novel',
  title: '夏目友人懒人帐',
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
