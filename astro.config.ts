import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

const site = 'https://git-novel.loc.cc';

export default defineConfig({
  site,
  base: '/',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/draft/') && !page.includes('/resume/'),
      serialize(item) {
        item.lastmod = new Date();
        return item;
      },
    }),
    react(),
  ],
  vite: {
    build: {
      rollupOptions: {
        output: {
          sanitizeFileName(name) {
            return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
          },
        },
      },
    },
  },
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
