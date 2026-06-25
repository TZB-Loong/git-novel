import { describe, it, expect } from 'vitest';
import { collectAlbumImages, sortAlbumsByDateDesc } from './gallery';

describe('collectAlbumImages', () => {
  it('resolves each image filename relative to album slug', () => {
    const album = {
      slug: 'demo',
      data: { images: ['1.svg', '2.svg'] },
    };
    const result = collectAlbumImages(album);
    expect(result).toEqual([
      { src: 'gallery/demo/1.svg', alt: 'demo image 1' },
      { src: 'gallery/demo/2.svg', alt: 'demo image 2' },
    ]);
  });

  it('returns empty array when images is empty', () => {
    const result = collectAlbumImages({ slug: 'x', data: { images: [] } });
    expect(result).toEqual([]);
  });

  it('uses image filename (without extension) as alt fallback', () => {
    const result = collectAlbumImages({
      slug: 'demo',
      data: { images: ['sunset.jpg'] },
    });
    expect(result[0].alt).toBe('demo image sunset');
  });
});

describe('sortAlbumsByDateDesc', () => {
  const albums = [
    { slug: 'a', data: { date: new Date('2024-01-01') } },
    { slug: 'b', data: { date: new Date('2024-03-01') } },
    { slug: 'c', data: { date: new Date('2024-02-01') } },
  ];

  it('sorts newest first', () => {
    const sorted = sortAlbumsByDateDesc(albums);
    expect(sorted.map((a) => a.slug)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input', () => {
    const before = albums.map((a) => a.slug);
    sortAlbumsByDateDesc(albums);
    expect(albums.map((a) => a.slug)).toEqual(before);
  });
});
