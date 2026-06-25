// Test stub for Astro's `astro/loaders` module.
// The `glob` loader is only exercised at build time; tests import schemas
// directly, so a no-op stub is sufficient to satisfy the import.
export function glob(_options: unknown): unknown {
  return {};
}
