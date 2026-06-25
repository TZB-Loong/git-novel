import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const stub = (name: string) =>
  fileURLToPath(new URL(`./vitest/stubs/${name}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^astro:content$/, replacement: stub('astro-content.ts') },
      { find: /^astro\/loaders$/, replacement: stub('astro-loaders.ts') },
    ],
  },
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
