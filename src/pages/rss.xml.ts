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
