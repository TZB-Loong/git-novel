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

/**
 * Generate a URL-safe entry ID from a content collection entry name.
 * Delegates to `toSlug` so Chinese filenames are converted to pinyin
 * and file extensions are stripped. Used as the `generateId` option on
 * every `glob()` loader so collection entry IDs match the site URL contract.
 */
export function generateId({ entry }: { entry: string }): string {
  return toSlug(entry);
}

const articles = defineCollection({
  loader: glob({
    base: './src/content/articles',
    pattern: '**/*.{md,mdx}',
    generateId,
  }),
  schema: articlesSchema,
});

const notes = defineCollection({
  loader: glob({
    base: './src/content/notes',
    pattern: '**/*.{md,mdx}',
    generateId,
  }),
  schema: notesSchema,
});

const albums = defineCollection({
  loader: glob({
    base: './src/content/albums',
    pattern: '**/*.{md,mdx}',
    generateId,
  }),
  schema: albumsSchema,
});

export const collections = { articles, notes, albums };

