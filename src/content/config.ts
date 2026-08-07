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
 * Resume / personal-info collection schema. Holds structured personal
 * data (name, contact, work history, skills, projects). Email is split
 * into user + domain so the page can assemble it via JS and avoid static
 * crawlers harvesting a plain-text address.
 *
 * Two resume profiles currently exist (采购/PMC, 前端开发) with different
 * sections, so most sections are optional; pages render only the fields
 * that are present.
 */
export const resumeSchema = z.object({
  name: z.string(),
  tagline: z.string().optional(),
  emailUser: z.string(),
  emailDomain: z.string(),
  objective: z.string(),
  summary: z.string().optional(),
  strengths: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
      }),
    )
    .optional(),
  skills: z
    .array(
      z.object({
        name: z.string(),
        detail: z.string(),
      }),
    )
    .optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        period: z.string(),
        role: z.string(),
        industry: z.string().optional(),
        summary: z.string().optional(),
        points: z.array(z.string()),
      }),
    )
    .optional(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        period: z.string(),
        role: z.string(),
        sections: z.array(
          z.object({
            title: z.string(),
            points: z.array(z.string()),
          }),
        ),
      }),
    )
    .optional(),
  education: z.object({
    school: z.string(),
    period: z.string(),
    degree: z.string(),
    major: z.string().optional(),
  }),
  certificates: z.array(z.string()).optional(),
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

const resume = defineCollection({
  loader: glob({
    base: './src/content/resume',
    pattern: '**/*.{md,mdx}',
    generateId,
  }),
  schema: resumeSchema,
});

export const collections = { notes, resume };
