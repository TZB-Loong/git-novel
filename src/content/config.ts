import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { toSlug } from '../lib/slug';

export const notesSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
  draft: z.boolean().default(false),
});

/**
 * Generate a URL-safe entry ID from a content collection entry name.
 * Delegates to `toSlug` so Chinese filenames are converted to pinyin
 * and file extensions are stripped. Used as the `generateId` option on
 * every `glob()` loader so collection entry IDs match the site URL contract.
 */
export function generateId({ entry }: { entry: string }): string {
  return toSlug(entry);
}

const notes = defineCollection({
  loader: glob({
    base: './src/content/notes',
    pattern: '**/*.{md,mdx}',
    generateId,
  }),
  schema: notesSchema,
});

export const collections = { notes };
