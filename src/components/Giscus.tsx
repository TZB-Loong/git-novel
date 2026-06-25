// src/components/Giscus.tsx
import Giscus from '@giscus/react';

export interface GiscusProps {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname';
  theme: 'light' | 'dark' | 'transparent_dark';
}

export default function GiscusComments(props: GiscusProps) {
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
      theme={props.theme}
      lang="zh-CN"
      loading="lazy"
    />
  );
}
