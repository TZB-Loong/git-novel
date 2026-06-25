// Test stub for Astro's `astro:content` virtual module.
// Vitest cannot resolve virtual modules — we stub `defineCollection` as an
// identity function and re-export `z` from zod so schema validation tests
// can run in isolation from the Astro build context.
import { z } from 'zod';

export { z };

export function defineCollection<T extends { schema: unknown }>(
  config: T,
): T {
  return config;
}
