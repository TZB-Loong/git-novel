// src/lib/gallery.ts

interface AlbumEntry {
  slug: string;
  data: { images: string[] };
}

interface ResolvedImage {
  src: string; // path relative to src/assets/, for astro:asset import
  alt: string;
}

export function collectAlbumImages(album: AlbumEntry): ResolvedImage[] {
  return album.data.images.map((filename) => {
    const baseName = filename.replace(/\.[^.]+$/, '');
    return {
      src: `gallery/${album.slug}/${filename}`,
      alt: `${album.slug} image ${baseName}`,
    };
  });
}

interface DatedAlbum {
  slug: string;
  data: { date: Date };
}

export function sortAlbumsByDateDesc<T extends DatedAlbum>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
}
