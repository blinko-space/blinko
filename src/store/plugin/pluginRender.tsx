import React, { useRef } from 'react';

interface PluginRenderProps {
  content: () => HTMLElement;
}

export const PluginRender: React.FC<PluginRenderProps> = ({ content }) => {
  const contentRef = useRef<HTMLElement | null>(null);

  return (
    <div id={`plugin-${content}`} ref={(el) => {
      if (el && !contentRef.current) {
        contentRef.current = content();
        el.appendChild(contentRef.current);
      }
    }} />
  );
}; 