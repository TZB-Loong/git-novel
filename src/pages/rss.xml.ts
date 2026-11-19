// src/pages/rss.xml.ts
import { getCollection } from 'astro:content';
import { SITE_CONFIG } from '../lib/config';
import { sortByDateDesc } from '../lib/date';
import type { APIContext } from 'astro';

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE_CONFIG.site);
  const notes = await getCollection('notes');
  const visible = notes.filter((entry) => !entry.data.draft);
  const sorted = sortByDateDesc(visible).slice(0, 20);

  const items = sorted
    .map((entry) => {
      const link = new URL(`notes/${entry.id}/`, site).href;
      return [
        '    <item>',
        `      <title>${escapeXml(entry.data.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${entry.data.pubDate.toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_CONFIG.title)}</title>
    <description>${escapeXml(SITE_CONFIG.description)}</description>
    <link>${escapeXml(site.href)}</link>
    <language>zh-CN</language>
    <atom:link href="${escapeXml(new URL('rss.xml', site).href)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
