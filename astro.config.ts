import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

// TODO(user): replace `username` with real GitHub username before first deploy.
const site = 'https://TZB-Loong.github.io';

export default defineConfig({
  site,
  base: '/git-novel',
  trailingSlash: 'always',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/draft/') && !page.includes('/resume/'),
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
