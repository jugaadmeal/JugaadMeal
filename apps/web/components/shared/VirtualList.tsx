'use client';

import React, { useState, useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  windowHeight?: number;
}

export default function VirtualList<T>({ items, itemHeight, renderItem, windowHeight = 350 }: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length, Math.floor((scrollTop + windowHeight) / itemHeight) + 2);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      onScroll={handleScroll}
      className="overflow-y-auto w-full rounded-3xl border border-edge/50 bg-white scrollbar-none"
      style={{ height: windowHeight }}
    >
      <div className="relative w-full" style={{ height: totalHeight }}>
        <div
          className="absolute top-0 left-0 right-0 w-full"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
        </div>
      </div>
    </div>
  );
}
