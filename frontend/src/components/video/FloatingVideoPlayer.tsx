'use client';

import { useRouter } from 'next/navigation';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { useState, useEffect, useRef } from 'react';
import Icon from '@/components/ui/Icon';

export default function FloatingVideoPlayer() {
  const { video, isMinimized, expand, closeVideo, minimize, containerElement } =
    useVideoPlayer();
  const router = useRouter();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  // Track container element position for full-page mode
  useEffect(() => {
    if (!containerElement) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setRect(containerElement.getBoundingClientRect());
      });
    };

    updateRect();

    const observer = new ResizeObserver(updateRect);
    observer.observe(containerElement);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [containerElement]);

  if (!video) return null;

  const isFullPage = !!containerElement && !isMinimized && !!rect;

  const handleExpand = () => {
    expand();
    router.push(video.fullPagePath);
  };

  const handleMinimize = () => {
    minimize();
  };

  // Not full-page → show as mini player (minimized explicitly OR navigated away)
  const isMini = !isFullPage;

  // Determine wrapper positioning based on mode
  const wrapperStyle: React.CSSProperties = isFullPage
    ? {
        position: 'fixed',
        top: rect!.top,
        left: rect!.left,
        width: rect!.width,
        height: rect!.height,
        zIndex: 50,
        borderRadius: '0.75rem',
        overflow: 'hidden',
      }
    : {
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 60,
        width: 400,
        borderRadius: '0.75rem',
        overflow: 'hidden',
      };

  return (
    <div
      style={wrapperStyle}
      className={`${isFullPage ? 'group' : ''} ${isMini ? 'shadow-[0px_24px_48px_-12px_rgba(0,0,0,0.4)] outline outline-1 outline-offset-[-1px] outline-stroke-secondary animate-slideUp' : ''}`}
    >
      {/* Mini player header — always in DOM for stable tree, hidden when full-page */}
      <div
        className={`px-3 py-2 bg-[#1a1a2e] flex items-center gap-2 ${!isMini ? 'hidden' : ''}`}
      >
        <span className="flex-1 text-text-white text-xs font-medium leading-4 truncate">
          {video.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpand}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Expandir"
          >
            <Icon name="open_in_full" size={16} className="text-icon-white" />
          </button>
          <button
            onClick={closeVideo}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title="Cerrar"
          >
            <Icon name="close" size={16} className="text-icon-white" />
          </button>
        </div>
      </div>

      {/* Iframe — single persistent instance, never remounts */}
      <div className={isMini ? 'aspect-video bg-black' : 'w-full h-full bg-black'}>
        <iframe
          src={video.videoUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title={video.title}
        />
      </div>

      {/* Minimize overlay — only visible in full-page mode on hover */}
      {isFullPage && (
        <div className="absolute top-12 right-1 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={handleMinimize}
            className="w-10 h-10 flex items-center justify-center bg-black/60 rounded-none hover:bg-black/80 transition-colors"
            title="Minimizar"
          >
            <Icon
              name="picture_in_picture_alt"
              size={20}
              className="text-icon-white"
            />
          </button>
        </div>
      )}
    </div>
  );
}
