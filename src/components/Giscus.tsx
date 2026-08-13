// src/components/Giscus.tsx
import Giscus from '@giscus/react';
import { useEffect, useState } from 'react';

export interface GiscusProps {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname';
  theme: 'light' | 'dark' | 'transparent_dark';
}

export default function GiscusComments(props: GiscusProps) {
  const [theme, setTheme] = useState<GiscusProps['theme']>(props.theme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setTheme(root.dataset.theme === 'dark' ? 'dark' : props.theme);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('themechange', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('themechange', sync);
    };
  }, [props.theme]);

  return (
    <Giscus
      repo={props.repo as `${string}/${string}`}
      repoId={props.repoId}
      category={props.category}
      categoryId={props.categoryId}
      mapping={props.mapping}
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme}
      lang="zh-CN"
      loading="lazy"
    />
  );
}
